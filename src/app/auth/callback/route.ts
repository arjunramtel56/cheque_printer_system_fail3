import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Stub auth callback route.
 *
 * This is the landing point for the OAuth/provider redirect flow described in
 * the project structure (src/app/auth/callback/route.ts). In the current build
 * authentication uses a demo gate (see src/lib/auth.ts and src/lib/admin.ts),
 * so this route simply echoes the query parameters it received rather than
 * completing a real provider exchange.
 *
 * When the production auth provider is wired up, this handler should:
 *   1. extract `code` from the query string
 *   2. exchange it with the provider's token endpoint
 *   3. verify the returned ID token / access token
 *   4. set a secure, httpOnly session cookie
 *   5. redirect the user to /print or their last visited route
 *
 * For now it returns a minimal JSON payload so the route is reachable and
 * type-checkable, matching the structure the rest of the codebase expects.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Authentication failed", detail: error },
      { status: 401 },
    );
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing authorization code" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Callback received. Wire up the provider token exchange here.",
    code,
    state,
  });
}
