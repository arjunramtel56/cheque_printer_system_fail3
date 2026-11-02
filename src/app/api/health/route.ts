export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { describePrismaError, isPrismaUnavailable } from "@/lib/prisma-errors";

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
      { status: 503 }
    );
  }

  const startedAt = Date.now();

  try {
    const latencyMs = await new Promise<number>((resolve) => {
      const before = Date.now();
      prisma.$queryRaw`SELECT 1`.finally(() => resolve(Date.now() - before));
    });

    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbOk = false;
      console.error("[HEALTH_CHECK] Database probe failed:", describePrismaError(error));

      if (isPrismaUnavailable(error)) {
        return NextResponse.json(
          {
            status: "unhealthy",
            issues: [exposeDetails ? "Database unavailable" : "Service unavailable"],
            ...(exposeDetails ? { dbHost: env.dbHost } : {}),
            responseTimeMs: Date.now() - startedAt,
          },
          { status: 503 }
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        status: "healthy",
        dbHost: env.dbHost,
        responseTimeMs: Date.now() - startedAt,
        dbLatencyMs: latencyMs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HEALTH_CHECK] Unexpected error:", describePrismaError(error));

    return NextResponse.json(
      {
        status: "unhealthy",
        issues: ["Unexpected internal error"],
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}
