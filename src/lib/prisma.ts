// =============================================================================
// Prisma client instance for the Reactify Cheque Printer System.
//
// STATUS: placeholder — the current repository ships no server-side persistence.
// This module is imported by future API routes (scheduled for V1.8 hardening
// phase) and by prisma/seed.ts. It is not used by the client-side app today.
//
// @prisma/client is an optional dependency; it is installed only when the
// server-side hardening phase is activated. The guard below keeps typecheck
// and build green even when the package is absent.
// =============================================================================

declare global {
  // Allow global `prisma` variable in development to avoid hot-reload
  // creating multiple Prisma client instances.
  // eslint-disable-next-line no-var
  var prisma: { new (opts?: Record<string, unknown>): Record<string, unknown> } | undefined;
}

let prisma: unknown;

try {
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new (opts?: Record<string, unknown>) => Record<string, unknown>;
  };
  const instance = new PrismaClient({ log: ["query", "error", "warn"] });

  prisma = (globalThis as { prisma?: unknown }).prisma || instance;

  if (process.env.NODE_ENV !== "production") {
    (globalThis as { prisma?: unknown }).prisma = prisma;
  }
} catch {
  // @prisma/client is not installed — this is expected in the client-only build.
  // API routes that need it should be gated behind a runtime check.
  prisma = undefined;
}

export default prisma;
