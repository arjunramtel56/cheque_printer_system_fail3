import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth-token";
import { getFreshAccess } from "@/lib/access";
import { isAccountBlocked, isTrialExpired } from "@/lib/trial";
import type { NextRequest } from "next/server";

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = await getSessionToken(request);
  return token?.id as string | null;
}

/**
 * The caller identity for a route handler.
 *
 * `role`, `status` and `trialExpired` are read from the database rather than
 * trusted from the session cookie. Auth.js seals those claims at sign-in, so a
 * suspended account, a revoked admin or a promoted trial user would otherwise
 * keep their old rights until they logged in again — which for a 30-day session
 * is effectively "never".
 *
 * A blocked account (SUSPENDED / EXPIRED) resolves to null, so every route's
 * existing "not authenticated" branch refuses it — a suspension therefore
 * takes effect on the next API call instead of at the next sign-in. Returning
 * null is deliberate: it makes the check impossible to forget in a new route,
 * rather than relying on each handler to remember to read `status`.
 *
 * A failed read falls back to the sealed claims: the database being unreachable
 * is not an authentication decision, and the route's own query is about to fail
 * anyway.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const token = await getSessionToken(request);
  if (!token) return null;

  const id = token.id as string;

  const user = {
    id,
    email: token.email as string,
    name: token.name as string,
    role: token.role as string,
    status: token.status as string,
    trialExpired: isTrialExpired({
      role: token.role as string,
      trialExpiresAt: token.trialExpiresAt as string | null,
      legacyTrialExpired: token.trialExpired as boolean,
    }),
  };

  try {
    const fresh = await getFreshAccess(id);
    if (fresh) {
      if (isAccountBlocked(fresh.status)) return null;

      user.role = fresh.role;
      user.status = fresh.status;
      user.trialExpired = fresh.trialExpired;
    }
  } catch (error) {
    console.warn(
      "[AUTH_CLAIMS_UNVERIFIED] falling back to session claims:",
      (error as Error)?.message
    );
  }

  return user;
}

export function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
