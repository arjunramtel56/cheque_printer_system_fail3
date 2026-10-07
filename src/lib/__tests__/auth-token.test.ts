import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { encode, getToken } from "next-auth/jwt";
import { getSessionToken, isSecureRequest } from "../auth-token";

/**
 * Regression guard for the production-only auth failure.
 *
 * Over HTTPS, Auth.js names the session cookie `__Secure-authjs.session-token`
 * and salts the JWT with that same name. A bare `getToken({ req, secret })`
 * looks for the unprefixed `authjs.session-token`, finds nothing, and treats a
 * signed-in user as anonymous - which is exactly why login worked on
 * http://localhost but bounced straight back to the login page on Vercel.
 */

const SECRET = "unit-test-secret-0123456789abcdefghijklmnop";
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

process.env.AUTH_SECRET = SECRET;

async function tokenFor(salt: string): Promise<string> {
  return encode({ token: { sub: "user-1", id: "user-1" }, secret: SECRET, salt });
}

function request(url: string, cookieName: string, token: string): NextRequest {
  return new NextRequest(url, {
    headers: { cookie: `${cookieName}=${token}` },
  });
}

describe("getSessionToken over HTTPS", () => {
  it("reads the __Secure- session cookie", async () => {
    const token = await tokenFor(SECURE_COOKIE);
    const request_ = request("https://example.com/en/dashboard", SECURE_COOKIE, token);

    assert.equal(isSecureRequest(request_), true);
    const decoded = await getSessionToken(request_);
    assert.equal(decoded?.id, "user-1", "secure session cookie must be readable");
  });

  it("still reads the unprefixed cookie over http (local development)", async () => {
    const token = await tokenFor(PLAIN_COOKIE);
    const request_ = request("http://localhost:3000/en/dashboard", PLAIN_COOKIE, token);

    assert.equal(isSecureRequest(request_), false);
    const decoded = await getSessionToken(request_);
    assert.equal(decoded?.id, "user-1");
  });

  it("honours a proxy-set x-forwarded-proto header", async () => {
    const token = await tokenFor(SECURE_COOKIE);
    const request_ = new NextRequest("http://internal-host/en/dashboard", {
      headers: { cookie: `${SECURE_COOKIE}=${token}`, "x-forwarded-proto": "https" },
    });

    assert.equal(isSecureRequest(request_), true);
    assert.equal((await getSessionToken(request_))?.id, "user-1");
  });

  it("demonstrates the bug: a bare getToken() cannot see the secure cookie", async () => {
    const token = await tokenFor(SECURE_COOKIE);
    const request_ = request("https://example.com/en/dashboard", SECURE_COOKIE, token);

    assert.equal(
      await getToken({ req: request_, secret: SECRET }),
      null,
      "plain getToken() misses the __Secure- cookie, so every route must use getSessionToken()"
    );
  });

  it("returns null when there is no session cookie", async () => {
    const request_ = new NextRequest("https://example.com/en/dashboard");
    assert.equal(await getSessionToken(request_), null);
  });
});
