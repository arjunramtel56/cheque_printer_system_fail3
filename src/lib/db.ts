import prisma from "./prisma";

export { prisma };

export async function connectDB() {
  try {
    if (prisma) {
      await (prisma as { $connect: () => Promise<void> }).$connect();
    }
  } catch {
    console.warn("Database connection failed - running in client-only mode");
  }
}

export async function disconnectDB() {
  try {
    if (prisma) {
      await (prisma as { $disconnect: () => Promise<void> }).$disconnect();
    }
  } catch {
    // silently ignore
  }
}
