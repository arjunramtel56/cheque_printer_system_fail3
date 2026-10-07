/**
 * Prisma signals different classes of failure through different properties:
 *   - `PrismaClientKnownRequestError.code`         database-level errors
 *                                                 (P2002 duplicate, P2021 missing
 *                                                 table, P2022 missing column)
 *   - `PrismaClientInitializationError.errorCode`  connection/setup failures
 *                                                 (P1000 bad credentials,
 *                                                 P1001 unreachable, P1011 TLS)
 *
 * Reading only `.code` misses every connection failure, which is how an
 * unreachable production database ends up reported to the user as a generic
 * "internal server error". Resolve the code through here instead.
 *
 * This module deliberately does not import `@prisma/client`: it only inspects
 * the shape of an already-thrown error, so it stays usable anywhere and is
 * unit-testable without a generated client.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Best-effort Prisma error code for any thrown value. */
export function prismaErrorCode(error: unknown): string | undefined {
  if (!isObject(error)) return undefined;
  // `errorCode` (initialization errors) first: a raw Node socket error also
  // carries a `.code` such as "ECONNREFUSED", which is not a Prisma code.
  if (typeof error.errorCode === "string") return error.errorCode;
  if (typeof error.code === "string") return error.code;
  return undefined;
}

function isPrismaErrorNamed(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

/** The database is unreachable, refusing this client, or misconfigured. */
const UNAVAILABLE_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1010",
  "P1011",
  "P1012",
  "P1017",
  "P2024",
]);

/** Connected, but the schema in the database does not match this client. */
const SCHEMA_CODES = new Set(["P2010", "P2021", "P2022", "P3005"]);

/**
 * True when the database itself is the problem rather than the request.
 * These are infrastructure faults: the caller must answer 503, not 500.
 */
export function isPrismaUnavailable(error: unknown): boolean {
  // An initialization error means Prisma could not open a connection at all:
  // a missing or invalid DATABASE_URL, a TLS failure, or a database that is
  // not reachable. That is never a bug in the calling route.
  if (isPrismaErrorNamed(error, "PrismaClientInitializationError")) return true;
  const code = prismaErrorCode(error);
  if (!code) return false;
  return UNAVAILABLE_CODES.has(code) || SCHEMA_CODES.has(code);
}

/** True for a unique-constraint violation (e.g. an email that already exists). */
export function isPrismaDuplicate(error: unknown): boolean {
  return prismaErrorCode(error) === "P2002";
}

const CONNECTION_STRING = /postgres(?:ql)?:\/\/[^\s"']+/gi;

/**
 * One-line, log-safe summary of a failure. Connection strings are redacted so
 * an error message can never leak DATABASE_URL into the logs.
 */
export function describePrismaError(error: unknown): string {
  const code = prismaErrorCode(error);
  const name = error instanceof Error ? error.name : typeof error;
  const message = (error instanceof Error ? error.message : String(error)).replace(
    CONNECTION_STRING,
    "postgresql://[redacted]"
  );
  return `${name}${code ? ` [${code}]` : ""}: ${message}`;
}
