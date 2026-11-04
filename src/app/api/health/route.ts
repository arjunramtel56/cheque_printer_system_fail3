export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { describePrismaError, isPrismaUnavailable } from "@/lib/prisma-errors";

const DB_TIMEOUT_MS = 5_000;
const REQUIRED_TABLES = ["User", "Subscription", "BankTemplate"] as const;

type RequiredTable = (typeof REQUIRED_TABLES)[number];
type TableCheckRow = Record<RequiredTable, string | null>;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Database health check timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Health check endpoint.
 *
 * Returns service availability status **without exposing secrets**:
 * - No connection string, secret, or token values in the response.
 * - The database host is reported so operators can confirm which database
 *   is being contacted, but credentials are never included.
 * - On error, a generic message is returned; full details go to the log only.
 *
 * Status codes:
 *   200 — database reachable and schema present
 *   503 — service unavailable (database unreachable or schema missing)
 */
export async function GET() {
  const env = validateEnv();

  // Diagnostic details (which variable failed, which DB host) are exposed to
  // anonymous callers only in non-production. In production the endpoint
  // stays truthfully 503s but reports the same generic "configuration"
  // message — infra fingerprinting aid for attackers is removed.
  const exposeDetails = process.env.NODE_ENV !== "production";

  if (!env.ok) {
    console.error("[HEALTH_CHECK] Environment validation failed:", env.errors);
    return NextResponse.json(
      {
        status: "unhealthy",
        ...(exposeDetails ? { issues: env.errors } : { issues: ["Service configuration error"] }),
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const startedAt = Date.now();

  try {
    const dbStartedAt = Date.now();
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
    const dbLatencyMs = Date.now() - dbStartedAt;

    // `SELECT 1` proves the connection works; these checks prove the deployed
    // schema is actually present. A reachable but uninitialized database must
    // not be reported as healthy.
    const rows = await withTimeout(
      prisma.$queryRaw<TableCheckRow[]>`
        SELECT
          to_regclass('public."User"')::text AS "User",
          to_regclass('public."Subscription"')::text AS "Subscription",
          to_regclass('public."BankTemplate"')::text AS "BankTemplate"
      `,
      DB_TIMEOUT_MS
    );

    const missingTables = REQUIRED_TABLES.filter((table) => !rows[0]?.[table]);

    if (missingTables.length > 0) {
      console.error("[HEALTH_CHECK] Database schema missing required tables:", missingTables);
      return NextResponse.json(
        {
          status: "unhealthy",
          issues: [
            exposeDetails
              ? `Database schema missing required tables: ${missingTables.join(", ")}`
              : "Service unavailable",
          ],
          ...(exposeDetails ? { dbHost: env.dbHost } : {}),
          responseTimeMs: Date.now() - startedAt,
        },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "healthy",
        database: "ok",
        schema: "ok",
        ...(exposeDetails ? { dbHost: env.dbHost } : {}),
        responseTimeMs: Date.now() - startedAt,
        dbLatencyMs,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("[HEALTH_CHECK] Database probe failed:", describePrismaError(error));
    const issue = isPrismaUnavailable(error)
      ? "Database unavailable"
      : "Database schema check failed";

    return NextResponse.json(
      {
        status: "unhealthy",
        issues: [exposeDetails ? issue : "Service unavailable"],
        ...(exposeDetails ? { dbHost: env.dbHost } : {}),
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
