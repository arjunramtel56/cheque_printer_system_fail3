import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  return token?.id as string | null;
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token) return null;

  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as string,
    status: token.status as string,
  };
}

export function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
