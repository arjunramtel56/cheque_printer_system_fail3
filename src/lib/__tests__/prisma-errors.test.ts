import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describePrismaError,
  isPrismaDuplicate,
  isPrismaUnavailable,
  prismaErrorCode,
} from "../prisma-errors";

/** Mirrors a PrismaClientKnownRequestError: carries `code`. */
function knownRequestError(code: string): Error {
  const error = new Error(`known request error ${code}`);
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code, clientVersion: "5.22.0" });
  return error;
}

/** Mirrors a PrismaClientInitializationError: carries `errorCode`. */
function initializationError(errorCode?: string): Error {
  const error = new Error("Can't reach database server");
  error.name = "PrismaClientInitializationError";
  Object.assign(error, { errorCode, clientVersion: "5.22.0" });
  return error;
}

describe("prismaErrorCode", () => {
  it("reads code from a known request error", () => {
    assert.equal(prismaErrorCode(knownRequestError("P2021")), "P2021");
  });

  it("reads errorCode from an initialization error", () => {
    assert.equal(prismaErrorCode(initializationError("P1001")), "P1001");
  });

  it("prefers errorCode over code so node socket codes cannot masquerade", () => {
    const error = Object.assign(new Error("mixed"), { code: "ECONNREFUSED", errorCode: "P1001" });
    assert.equal(prismaErrorCode(error), "P1001");
  });

  it("returns undefined for non-error values", () => {
    assert.equal(prismaErrorCode(null), undefined);
    assert.equal(prismaErrorCode("P2021"), undefined);
    assert.equal(prismaErrorCode(new Error("boom")), undefined);
  });
});

describe("isPrismaUnavailable", () => {
  it("treats a connection failure as an infrastructure fault", () => {
    assert.equal(isPrismaUnavailable(initializationError("P1001")), true);
  });

  it("treats a misconfigured client with no code as an infrastructure fault", () => {
    assert.equal(isPrismaUnavailable(initializationError(undefined)), true);
  });

  it("treats a missing table or column as an infrastructure fault", () => {
    assert.equal(isPrismaUnavailable(knownRequestError("P2021")), true);
    assert.equal(isPrismaUnavailable(knownRequestError("P2022")), true);
  });

  it("does not treat an ordinary bug as an infrastructure fault", () => {
    assert.equal(isPrismaUnavailable(new Error("boom")), false);
    assert.equal(isPrismaUnavailable(knownRequestError("P2003")), false);
  });

  it("does not treat a duplicate as an unavailable database", () => {
    assert.equal(isPrismaUnavailable(knownRequestError("P2002")), false);
  });
});

describe("isPrismaDuplicate", () => {
  it("recognises a unique constraint violation", () => {
    assert.equal(isPrismaDuplicate(knownRequestError("P2002")), true);
  });

  it("ignores other failures", () => {
    assert.equal(isPrismaDuplicate(knownRequestError("P2021")), false);
    assert.equal(isPrismaDuplicate(new Error("boom")), false);
  });
});

describe("describePrismaError", () => {
  it("includes the error name and code for operators", () => {
    const line = describePrismaError(knownRequestError("P2021"));
    assert.match(line, /PrismaClientKnownRequestError/);
    assert.match(line, /\[P2021\]/);
  });

  it("redacts a connection string so DATABASE_URL cannot leak into logs", () => {
    const line = describePrismaError(
      new Error("Error parsing connection string: postgresql://neondb_owner:sup3rsecret@host/db")
    );
    assert.ok(!line.includes("sup3rsecret"), `leaked password: ${line}`);
    assert.match(line, /postgresql:\/\/\[redacted\]/);
  });
});
