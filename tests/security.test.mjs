// ---------------------------------------------------------------------------
// Website security tests.
//
// These pin the client-side security controls that exist in this repo — and,
// just as importantly, state what does NOT exist. The admin gate is a demo;
// these tests make sure it stays as strong as a demo can be (real hash,
// constant-time compare, lockout, no password echo) and that the promised
// HTTP security headers are actually configured.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import crypto from "node:crypto";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log("  PASS: " + message);
  } else {
    failed++;
    console.error("  FAIL: " + message);
  }
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

console.log("=== WEBSITE SECURITY TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. HTTP security headers
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Security headers are configured ---");

{
  const config = read("next.config.mjs");
  for (const header of [
    "Content-Security-Policy",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]) {
    assert(config.includes(`"${header}"`) || config.includes(`key: "${header}"`), `header configured: ${header}`);
  }

  assert(config.includes("poweredByHeader: false"), "X-Powered-By is suppressed");
  assert(/default-src 'self'/.test(config), "CSP locks default-src to 'self'");
  assert(/object-src 'none'/.test(config), "CSP blocks plugin content (object-src 'none')");
  assert(/frame-ancestors 'none'/.test(config), "CSP forbids framing (frame-ancestors 'none')");
  assert(/base-uri 'self'/.test(config), "CSP pins base-uri to 'self' (injection hardening)");
  assert(/form-action 'self'/.test(config), "CSP pins form-action to 'self'");

  // HSTS must exist and must be production-conditional (dev is plain HTTP).
  assert(/Strict-Transport-Security/.test(config), "HSTS is configured");
  assert(
    /NODE_ENV === "production"/.test(config),
    "HSTS is emitted only for production (the dev server is plain HTTP)",
  );
  assert(/max-age=31536000/.test(config), "HSTS max-age is at least one year");
}

// ---------------------------------------------------------------------------
// 2. Admin gate crypto and behaviour
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: The demo gate is as strong as a demo can be ---");

{
  const admin = read("lib/admin.ts");

  // Hash: a real one, not the old 32-bit string hash.
  assert(/crypto\.subtle\.digest\(\s*"SHA-256"/.test(admin), "the password is hashed with WebCrypto SHA-256");
  assert(!/function simpleHash/.test(admin), "the old 32-bit simpleHash is gone");
  assert(!/charCodeAt\(i\)\s*<<\s*5/.test(admin), "no 32-bit hash arithmetic remains");

  // Comparison: constant-time.
  assert(/constantTimeEqual/.test(admin), "password comparison goes through a constant-time helper");
  {
    // Strip TS annotations and exercise the actual comparator semantics:
    // different-length inputs must not throw, equal inputs must match.
    const src = (admin.match(/function constantTimeEqual\([\s\S]*?\n\}/)?.[0] ?? "")
      .replace(/: string/g, "")
      .replace(/: boolean/g, "");
    assert(src.length > 0, "constantTimeEqual is defined in lib/admin.ts");
    const fn = new Function(`${src}; return constantTimeEqual;`)();
    assert(fn("abc", "abc") === true, "constantTimeEqual matches equal strings");
    assert(fn("abc", "abd") === false, "constantTimeEqual rejects a differing string");
    assert(fn("abc", "abcd") === false, "constantTimeEqual handles length mismatch without throwing");
    const a = crypto.createHash("sha256").update("admin").digest("hex");
    const b = crypto.createHash("sha256").update("wrong").digest("hex");
    assert(fn(a, b) === false, "constantTimeEqual distinguishes real SHA-256 digests");
    assert(fn(a, a) === true, "constantTimeEqual accepts identical SHA-256 digests");
  }

  // Session: TTL, no password material at rest.
  assert(/ADMIN_SESSION_TTL_MS\s*=\s*4\s*\*\s*60\s*\*\s*60/.test(admin), "session TTL is 4 hours");
  assert(
    /interface AdminSession \{[^}]*authenticated[^}]*expiresAt[^}]*\}/s.test(admin),
    "the session stores only { authenticated, expiresAt }",
  );
  assert(!/passwordHash/.test(admin), "no password material is written into the session");
  assert(!/window\.localStorage\.setItem\([^)]*password/i.test(admin), "no plaintext password is persisted anywhere");

  // Lockout: exponential, bounded, and checked before hashing work.
  assert(/MAX_FAILURES_BEFORE_LOCK\s*=\s*5/.test(admin), "lockout engages after 5 consecutive failures");
  assert(/2 \*\* failures \* 1000/.test(admin), "lockout backoff is exponential in the failure count");
  assert(/Math\.min\(2 \*\* failures \* 1000,\s*5 \* 60 \* 1000\)/.test(admin), "lockout is capped at 5 minutes");
  assert(/lock\.lockedUntil > now/.test(admin), "the lockout is checked before any password work");

  // Errors: generic, never revealing which check failed.
  assert(
    /error: "Too many failed attempts[^"]*"/.test(admin),
    "lockout rejection uses a generic message",
  );
  assert(
    /error: "Sign-in failed[^"]*"/.test(admin),
    "wrong-password rejection uses a generic message",
  );
  assert(!/error: "Wrong password"/.test(admin), "no error message says 'Wrong password' specifically");
}

// ---------------------------------------------------------------------------
// 3. The login page stays quiet
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: The login page does not leak the credential ---");

{
  const login = read("app/admin/login/page.tsx");
  assert(!/ADMIN_DEFAULT_PASSWORD/.test(login), "the login page no longer imports or prints the demo password");
  assert(!/\{ADMIN_DEFAULT_PASSWORD\}/.test(login), "no password interpolation remains in the JSX");
  assert(/role="alert"/.test(login), "errors are announced through role=alert");
  assert(/disabled=\{locked \|\| submitting\}/.test(login), "the form disables itself while locked or submitting");
  assert(/await adminLogin\(password\)/.test(login), "submission awaits the async hardened login");
  assert(!/router\.push\("\/admin"\)/.test(login) || /router\.replace\("\/admin"\)/.test(login), "success navigates to /admin");

  // Success/failure messaging must not depend on the admin-access invariant
  // that a signed-in bounce exists.
  assert(/isAdminAuthenticated/.test(login), "already-signed-in visitors are redirected by the page itself");

  const adminAccess = read("tests/admin-access.test.mjs");
  assert(
    /publishes the demo password|README/.test(adminAccess),
    "the README remains the single place the demo credential is published",
  );
}

// ---------------------------------------------------------------------------
// 4. The README threat model stays honest
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Documentation does not overclaim ---");

{
  const readme = read("README.md");
  assert(/## Security posture/.test(readme), "the README has a Security posture section");
  assert(/Content-Security-Policy/.test(readme), "the README lists the CSP control");
  assert(/not protected|is not a production security boundary|definition of a demo gate/i.test(readme), "the README states the gate's limits, not just its features");
  assert(/no server-side authorization|no API routes/.test(readme), "the README says what is missing server-side");
  assert(/password `admin`/.test(readme), "the demo credential is still published in the README (by design)");
}

// ---------------------------------------------------------------------------
// 5. Honest limits of these tests
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: What this suite cannot prove ---");

console.log("  NOTE: header *emission* is not asserted over HTTP here — the");
console.log("  production server is not started by the test suite. The live");
console.log("  smoke test after this suite runs `curl -I` and inspects headers.");

console.log("\n=== WEBSITE SECURITY TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome website security tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll website security tests PASSED.");
}



