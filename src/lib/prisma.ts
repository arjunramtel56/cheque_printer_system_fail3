// =============================================================================
// Prisma client instance for the Reactify Cheque Printer System.
//
// STATUS: placeholder — the current repository ships no server-side persistence.
// This module is imported by future API routes (scheduled for V1.8 hardening
// phase) and by prisma/seed.ts. It is not used by the client-side app today.
// =============================================================================

import { PrismaClient } from "@prisma/client";

declare global {
  // Allow global `prisma` variable in development to avoid hot-reload
  // creating multiple Prisma client instances.
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
