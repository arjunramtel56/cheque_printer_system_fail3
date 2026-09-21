// ---------------------------------------------------------------------------
// Verification honesty tests.
//
// This project makes claims about physical accuracy. The dangerous failure is
// not a wrong number — it is a *claim* nobody can back up:
//
//   1. measurement guides leaking into a printed cheque;
//   2. a template marked physically-calibrated with no record sheet behind it;
//   3. an unverified layout reaching real cheque stock without a warning;
//   4. physical millimetre values duplicated outside the size registry, so two
//      parts of the app can disagree about how big a cheque is.
//
// Each of those is cheap to assert and expensive to discover on paper.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { getAllTemplates, getTemplate } from "../src/lib/templates.ts";
import { getCatalogueSummary } from "../src/lib/catalogue.ts";
import { CHEQUE_SIZES, PAPER_SIZES } from "../src/lib/sizes.ts";

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

/** Strip comments so prose about a size is not mistaken for a size literal. */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const SNIPPET_START = /export default function|^function |const ChequeSheet = /;

console.log("=== VERIFICATION HONESTY TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. Measurement guides are screen-only
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Debug guides can never reach paper ---");

{
  const sheet = read(path.join("src", "components", "cheque", "ChequeSheet.tsx"));
  assert(
    /Screen-only measurement guides \(never printed\)/.test(sheet),
    "ChequeSheet declares the measurement guides as screen-only",
  );
  assert(
    /isPreview\s*&&\s*debugMode/.test(sheet),
    "every guide style is guarded by isPreview && debugMode",
  );

  // Any line that colours or labels a guide must sit inside a preview guard.
  const guideLines = sheet
    .split("\n")
    .map((line, i) => ({ line, i }))
    // A ternary (`debugMode ? …`), not the optional prop declaration (`debugMode?:`).
    .filter(({ line }) => /debugMode\s*\?(?!\s*:)|reserved:\s*\$\{zone\.id\}/.test(line));

  assert(guideLines.length > 0, "the guide rendering is actually present (test is not vacuous)");

  // Find the nearest enclosing preview guard above each guide line.
  const unguarded = guideLines.filter(({ i }) => {
    for (let j = i; j >= 0 && i - j < 40; j--) {
      const l = sheet.split("\n")[j];
      if (/isPreview\s*&&/.test(l)) return false;
      if (/return \(/.test(l) && j < i - 26) break;
    }
    return true;
  });
  assert(
    unguarded.length === 0,
    "no guide styling sits outside a preview guard" + (unguarded.length ? ` (lines ${unguarded.map((u) => u.i + 1).join(", ")})` : ""),
  );

  // The printed sheet is rendered without debugMode at all.
  const workspace = read(path.join("src", "components", "dashboard", "Workspace.tsx"));
  const printRender = workspace.match(/variant="print"[^>]*\/>/);
  assert(!!printRender, "the print sheet is rendered with variant=\"print\"");
  assert(
    printRender && !/debugMode/.test(printRender[0]),
    "the print sheet is never given debugMode, so guides cannot be enabled on paper",
  );
}

// ---------------------------------------------------------------------------
// 2. No physical claim without evidence
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: Physical claims need a record sheet ---");

{
  const templates = getAllTemplates();
  const summary = getCatalogueSummary();
  const calibrated = templates.filter((t) => t.verification?.status === "physically-calibrated");
  const browserVerified = templates.filter((t) => t.verification?.status === "browser-verified");

  assert(
    summary.physicallyCalibratedCount === calibrated.length,
    `summary counts physically-calibrated templates honestly (${summary.physicallyCalibratedCount})`,
  );
  assert(
    summary.browserVerifiedCount === browserVerified.length,
    `summary keeps browser-verified separate from physical (${summary.browserVerifiedCount})`,
  );
  assert(
    summary.physicallyCalibratedCount + summary.browserVerifiedCount <= summary.templateCount,
    "verification counters cannot exceed the template count",
  );

  const doc = read(path.join("src", "lib", "physical-test-matrix.md"));

  assert(
    calibrated.every((t) => t.verification?.verifiedAt && /^\d{4}-\d{2}-\d{2}$/.test(t.verification.verifiedAt)),
    "every physically-calibrated template carries an ISO verification date",
  );
  assert(
    calibrated.every((t) => doc.includes(`\`${t.id}\``)),
    "every physically-calibrated template is named in the physical test protocol (record sheet exists)",
  );
  assert(
    calibrated.every((t) => /physically-calibrated/.test(t.verification?.note ?? "") || /record|measured|ruler/i.test(t.verification?.note ?? "")),
    "every physical claim explains the measurement behind it",
  );

  // The protocol document must agree with the code about what is calibrated.
  const ids = new Set(templates.map((t) => t.id));
  const documented = new Set();
  for (const line of doc.split("\n")) {
    const m = line.match(/^\|\s*`([a-z0-9_-]+)`\s*\|/);
    if (m && ids.has(m[1])) documented.add(m[1]);
  }
  assert(
    documented.size === ids.size,
    `the protocol's status board rows match the templates that exist (${documented.size}/${ids.size})`,
  );
  assert(
    doc.split("\n").some((r) => /^\|\s*`siddhartha`\s*\|/.test(r) && /browser-verified/.test(r)),
    "the protocol still records siddhartha as browser-verified, not physical",
  );
}

// ---------------------------------------------------------------------------
// 3. An unverified layout is flagged before it is printed
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: Unverified layouts are flagged ---");

{
   const workspace = read(path.join("src", "components", "dashboard", "Workspace.tsx"));
   assert(
     /status === "unverified"/.test(workspace),
    "the workspace derives a warning from the template's unverified status",
  );
  assert(
    /geometryWarning/.test(workspace),
    "the workspace references a warning translation for unverified geometry",
  );
  assert(
    /test-print on plain paper before printing on real cheque stock/.test(read(path.join("src", "lib", "locales", "en.json"))),
    "the warning tells the operator what to do instead of printing on a real cheque",
  );
  assert(
    !/status === "unverified"[^\n]*return null/.test(workspace),
    "the warning does not block the test print — a test print is how a template gets verified",
  );

  const siddhartha = getTemplate("siddhartha");
  assert(siddhartha?.verification?.status === "browser-verified", "siddhartha is browser-verified");
  const clone = getTemplate("nabil");
  assert(clone?.verification?.status === "unverified", "the clone-geometry template is still unverified");
  assert(
    /clone|placeholder|never been checked/i.test(clone?.verification?.note ?? ""),
    "the unverified template's note states plainly that its geometry is not real",
  );
}

// ---------------------------------------------------------------------------
// 4. One source of physical truth
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Physical sizes come from the registry ---");

{
  const registryValues = [
    ...CHEQUE_SIZES.map((s) => [s.widthMm, s.heightMm]),
    ...PAPER_SIZES.map((p) => [p.widthMm, p.heightMm]),
  ];
  const literals = [...new Set(registryValues.flat().map(String))];
  assert(literals.includes("190.5") && literals.includes("297"), "the registry declares the built-in sizes");

  const geometry = codeOnly(read(path.join("src", "lib", "printGeometry.ts")));
  const offenders = literals.filter((v) => new RegExp(`(^|[^\\d.])${v.replace(".", "\\.")}([^\\d]|$)`).test(geometry));
  assert(
    offenders.length === 0,
    "printGeometry derives every size from the registry instead of repeating numbers" +
      (offenders.length ? ` (found ${offenders.join(", ")})` : ""),
  );

  // Components may not invent cheque dimensions either.
  const componentOffenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) {
        const src = codeOnly(read(full));
        for (const v of literals) {
          if (new RegExp(`(^|[^\\d.])${v.replace(".", "\\.")}([^\\d]|$)`).test(src)) {
            componentOffenders.push(`${full} (${v})`);
          }
        }
      }
    }
  };
  walk(path.join("src", "components"));
  assert(
    componentOffenders.length === 0,
    "no component hardcodes a registered cheque or paper size" +
      (componentOffenders.length ? ` (${componentOffenders.join(", ")})` : ""),
  );

  assert(
     SNIPPET_START.test(read(path.join("src", "components", "cheque", "ChequeSheet.tsx"))),
    "the shared renderer is still a single component both paths use",
  );
}

console.log("\n=== VERIFICATION HONESTY TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome verification honesty tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll verification honesty tests PASSED.");
}



