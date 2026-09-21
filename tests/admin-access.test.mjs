// ---------------------------------------------------------------------------
// Admin access tests.
//
// These exist because of a real outage: the auth gate lived at
// app/admin/layout.tsx, which is an ancestor of /admin/login as well. While
// signed out the gate returned null, so the sign-in form never rendered and the
// entire admin panel (V0.6 template management) was unreachable — while every
// route still answered HTTP 200, which is what made it look fine.
//
// The invariant under test:
//
//     /admin/login                outside the gate  -> always renders
//     /admin, /admin/banks, ...   inside the gate   -> redirect when signed out
//
// Route groups `(dashboard)` do not appear in URLs, so moving pages must not
// change a single href.
//
// Scope note: this is a structural, source-level suite. It cannot log in — the
// gate is a client-side demo gate with no server session — so "the form renders
// and sign-in works" is confirmed in the browser, not here. That limit is
// stated rather than hidden.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

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

const ADMIN_DIR = path.join("app", "admin");
const DASHBOARD_DIR = path.join(ADMIN_DIR, "(dashboard)");
const GATE_LAYOUT = path.join(DASHBOARD_DIR, "layout.tsx");
const LOGIN_PAGE = path.join(ADMIN_DIR, "login", "page.tsx");
const ROOT_ADMIN_LAYOUT = path.join(ADMIN_DIR, "layout.tsx");

function exists(p) {
  return fs.existsSync(p);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

/** Every page.tsx under app/admin, as paths relative to the project root. */
function adminPages(dir = ADMIN_DIR, acc = []) {
  if (!exists(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) adminPages(full, acc);
    else if (entry.name === "page.tsx") acc.push(full);
  }
  return acc;
}

console.log("=== ADMIN ACCESS TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. The sign-in route exists and is NOT inside the gated group
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Sign-in route is reachable ---");

assert(exists(LOGIN_PAGE), "the admin sign-in page exists at app/admin/login/page.tsx");
assert(
  !LOGIN_PAGE.startsWith(DASHBOARD_DIR),
  "the sign-in page is outside the gated (dashboard) group",
);
assert(exists(GATE_LAYOUT), "the auth gate lives in app/admin/(dashboard)/layout.tsx");

{
  // The original outage: a layout at app/admin/layout.tsx wraps /admin/login too.
  const hasRootLayout = exists(ROOT_ADMIN_LAYOUT);
  const rootLayoutGates = hasRootLayout && /isAdminAuthenticated\s*\(/.test(read(ROOT_ADMIN_LAYOUT));
  assert(
    !rootLayoutGates,
    "no layout above app/admin/login/page.tsx performs an auth check (the exact shape of the outage)",
  );
}

{
  const loginSource = read(LOGIN_PAGE);
  assert(/adminLogin\s*\(/.test(loginSource), "the sign-in form calls adminLogin()");
  assert(
    !/isAdminAuthenticated/.test(loginSource) || /useEffect/.test(loginSource),
    "the sign-in page only uses the auth check to bounce already-signed-in users",
  );
  assert(
    /router\.(push|replace)\("\/admin"\)/.test(loginSource),
    "a successful sign-in still lands on /admin",
  );
}

// ---------------------------------------------------------------------------
// 2. The gate exists and has no blank state
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: The gate never renders a blank screen ---");

{
  const gate = read(GATE_LAYOUT);
  assert(/isAdminAuthenticated\s*\(/.test(gate), "the gate checks isAdminAuthenticated()");
  assert(/router\.replace\(\s*LOGIN_ROUTE\s*\)|router\.replace\("\/admin\/login"\)/.test(gate), "the gate redirects signed-out visitors to the sign-in route");
  assert(
    !/return\s+null\s*;/.test(gate),
    "the gate never returns null — a signed-out admin route shows a visible state, not an empty page",
  );
  assert(gate.includes("Loading admin"), "the checking state is visible while auth is resolved");
  assert(
    /redirecting to sign-in|Signed out/.test(gate),
    "the signed-out state is visible rather than blank",
  );
  assert(
    /adminLogout\s*\(/.test(gate) && /setAuthed\(false\)/.test(gate),
    "signing out clears local auth state and returns to the sign-in route",
  );
}

// ---------------------------------------------------------------------------
// 3. Every protected page is inside the group; login is the only exception
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: Protected pages live inside the group ---");

{
  const pages = adminPages();
  const inside = pages.filter((p) => p.startsWith(DASHBOARD_DIR));
  const outside = pages.filter((p) => !p.startsWith(DASHBOARD_DIR));
  const normalise = (p) => p.split(path.sep).join("/");

  assert(pages.length >= 5, `all admin pages are discoverable (${pages.length} found)`);
  assert(
    outside.length === 1 && normalise(outside[0]) === "app/admin/login/page.tsx",
    "sign-in is the only admin page outside the gated group",
  );
  assert(inside.length >= 4, `the protected area has its pages in the group (${inside.length})`);

  const expected = [
    "app/admin/(dashboard)/page.tsx",
    "app/admin/(dashboard)/banks/page.tsx",
    "app/admin/(dashboard)/templates/page.tsx",
    "app/admin/(dashboard)/templates/[id]/page.tsx",
    "app/admin/(dashboard)/calibration/page.tsx",
  ];
  const normalised = inside.map(normalise).sort();
  for (const wanted of expected) {
    assert(normalised.includes(wanted), `protected page present: ${wanted}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Route groups never leak into URLs or links
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: URLs are unchanged by the group ---");

{
  const gate = read(GATE_LAYOUT);
  const expectedNav = ["/admin", "/admin/banks", "/admin/templates", "/admin/calibration"];
  for (const href of expectedNav) {
    assert(gate.includes(`href="${href}"`), `navigation keeps the public URL ${href}`);
  }
  assert(
    !/["'`]\/[^"'`\n]*\(dashboard\)/.test(gate),
    "the route group is a filesystem detail and never appears in a URL",
  );

  const offenders = [];
  const scan = (dir) => {
    if (!exists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(tsx|ts)$/.test(entry.name)) {
        const src = read(full);
        // A route group must only ever exist as a directory name. Mentions in
        // prose/comments are fine; anything inside a URL string is a broken
        // link waiting to happen.
        if (/["'`]\/[^"'`\n]*\(dashboard\)/.test(src)) offenders.push(full);
      }
    }
  };
  scan("app");
  scan("components");
  assert(offenders.length === 0, "no link or URL anywhere references the route group" + (offenders.length ? ` (${offenders.join(", ")})` : ""));
}

// ---------------------------------------------------------------------------
// 5. The demo gate stays honest about what it is
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: The demo gate is not presented as security ---");

{
  const lib = read(path.join("lib", "admin.ts"));
  assert(
    /demo|localStorage/i.test(lib.slice(0, 1200)),
    "lib/admin.ts documents itself as a client-side demo gate",
  );
  assert(
    !/process\.env\.[A-Z_]*SECRET/.test(lib),
    "no secret is read into the client-side gate (it has no server side)",
  );

  const readme = read("README.md");
  assert(
    /password `admin`/.test(readme) || /password `admin`/i.test(readme),
    "the README publishes the demo password rather than implying real credentials",
  );
  // The login page itself must not display the credential — it belongs in
  // documentation only, after the security hardening.
  const loginSource = read(LOGIN_PAGE);
  assert(
    !/ADMIN_DEFAULT_PASSWORD/.test(loginSource),
    "the login page does not print the demo password on screen",
  );
}

console.log("\n=== ADMIN ACCESS TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome admin access tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll admin access tests PASSED.");
}



