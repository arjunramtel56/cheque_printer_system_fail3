import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth-token";
import type { NextRequest } from "next/server";

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = await getSessionToken(request);
  return token?.id as string | null;
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = await getSessionToken(request);
  if (!token) return null;

  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as string,
    status: token.status as string,
    trialExpired: (token.trialExpired as boolean) ?? false,
  };
}

export function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
