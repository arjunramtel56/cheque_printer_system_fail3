import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../env";

const VALID_SECRET = "0123456789abcdef0123456789abcdef";
const VALID_URL = "postgresql://postgres:password@db.example.supabase.co:5432/postgres";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAuthSecret = process.env.AUTH_SECRET;

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.AUTH_SECRET;
});

afterEach(() => {
  restore("DATABASE_URL", originalDatabaseUrl);
  restore("AUTH_SECRET", originalAuthSecret);
});

describe("validateEnv", () => {
  it("reports missing required variables", () => {
    const result = validateEnv();

    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, [
      "DATABASE_URL is not set",
      "AUTH_SECRET is missing or too short (minimum 32 characters)",
    ]);
    assert.equal(result.dbHost, null);
  });

  it("accepts a complete postgresql connection string", () => {
    process.env.DATABASE_URL = VALID_URL;
    process.env.AUTH_SECRET = VALID_SECRET;

    const result = validateEnv();

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.dbHost, "db.example.supabase.co");
  });

  it("accepts the postgres:// scheme", () => {
    process.env.DATABASE_URL = "postgres://user:pass@db.internal:5432/app";
    process.env.AUTH_SECRET = VALID_SECRET;

    assert.equal(validateEnv().ok, true);
  });

  it("rejects a shell command that merely contains a database URL", () => {
    process.env.DATABASE_URL =
      '$env:DATABASE_URL="postgresql://postgres:password@db.example.supabase.co:5432/postgres"; npx prisma db push';
    process.env.AUTH_SECRET = VALID_SECRET;

    const result = validateEnv();

    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["DATABASE_URL is not a valid PostgreSQL connection string"]);
    assert.equal(result.dbHost, null);
  });

  it("rejects placeholder credentials", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:[YOUR-PASSWORD]@db.<PROJECT-REF>.supabase.co:5432/postgres";
    process.env.AUTH_SECRET = VALID_SECRET;

    const result = validateEnv();

    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["DATABASE_URL is not a valid PostgreSQL connection string"]);
  });

  it("rejects a URL without credentials", () => {
    process.env.DATABASE_URL = "postgresql://db.example.supabase.co:5432/postgres";
    process.env.AUTH_SECRET = VALID_SECRET;

    assert.equal(validateEnv().ok, false);
  });

  it("rejects surrounding whitespace", () => {
    process.env.DATABASE_URL = `${VALID_URL}\n`;
    process.env.AUTH_SECRET = VALID_SECRET;

    assert.equal(validateEnv().ok, false);
  });

  it("rejects a short AUTH_SECRET", () => {
    process.env.DATABASE_URL = VALID_URL;
    process.env.AUTH_SECRET = "too-short";

    const result = validateEnv();

    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, [
      "AUTH_SECRET is missing or too short (minimum 32 characters)",
    ]);
  });
});
