import { prisma } from "@/lib/prisma";
import { evaluateAccess, type AccessDecision } from "@/lib/trial";

/**
 * Authoritative, database-backed access state for one user.
 *
 * The middleware runs on the edge and cannot reach Prisma, so it evaluates the
 * (exact) timestamps sealed into the session token. This helper is for the Node
 * runtime — layouts, server components and route handlers — where the current
 * row is available and cheap to read, and where a role change or a suspension
 * must land immediately instead of at the user's next sign-in.
 */

export interface FreshAccess extends AccessDecision {
  role: string;
  status: string;
  trialExpiresAt: Date | null;
}

/**
 * Reads role/status/trial state for `userId`.
 *
 * Resolves to null when the account no longer exists (deleted mid-session).
 */
export async function getFreshAccess(userId: string): Promise<FreshAccess | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, trialExpires: true },
  });

  if (!user) return null;

  const decision = evaluateAccess({
    role: user.role,
    status: user.status,
    trialExpiresAt: user.trialExpires,
  });

  return {
    ...decision,
    role: user.role,
    status: user.status,
    trialExpiresAt: user.trialExpires,
  };
}
