import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Auth.js issues the session cookie under a `__Secure-` prefix whenever the
 * site is served over HTTPS, and uses that prefixed name as the salt it seals
 * the JWT with. `getToken()` on its own defaults to the unprefixed
 * `authjs.session-token`, so a hand-written call silently finds no cookie in
 * production while working perfectly on http://localhost.
 *
 * Every caller must resolve the cookie name through here instead of calling
 * `getToken()` directly, otherwise sessions are invisible on HTTPS.
 */

/** True when this request reached us over HTTPS (directly or via a proxy). */
export function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  return forwardedProto?.split(",")[0]?.trim().toLowerCase() === "https";
}

/** Decodes the Auth.js JWT session cookie for this request, or null. */
export async function getSessionToken(request: NextRequest) {
  return getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // Passing this also sets the default `salt` to the matching cookie name,
    // which is what the token was encrypted with.
    secureCookie: isSecureRequest(request),
  });
}
