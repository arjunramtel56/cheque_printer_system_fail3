// ---------------------------------------------------------------------------
// Size-system tests (PART 1) — the central physical size model.
//
// The guarantees under test:
//
//   1. ONE registry declares every physical millimetre value; nothing else in
//      the app hardcodes 190.5 / 88.9 / 210 / 297.
//   2. Cheque size and carrier paper size are separate concepts that never
//      merge — an A4 carrier never becomes the cheque.
//   3. Invalid dimensions (0, negative, NaN, Infinity, strings, unit-mistake
//      magnitudes) are rejected before they can generate print output.
//   4. The 190.5 × 88.9 mm landscape stock is a DEFAULT, not an assumption:
//      the engine treats any registered size identically.
//   5. Mode presentation (paper name, orientation) is derived from the paper
//      registry, never typed as a second copy.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import { CHEQUE_SIZES, PAPER_SIZES, MAX_DIMENSION_MM, createCustomChequeSize, getChequeSize, getPaperSize, isValidSizeValue, orientationFor, orientationMatchesSize, upsertChequeSize, validateSize } from "../lib/sizes.ts";
import { resolvePrintGeometry } from "../lib/printGeometry.ts";
import { getTemplate } from "../lib/templates.ts";
import { validateBankTemplate } from "../lib/validation.ts";

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

console.log("=== SIZE SYSTEM TESTS (PART 1) ===\n");

// ---------------------------------------------------------------------------
// 1. Registries: A4 exists, and is paper — never a cheque size
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Cheque size and carrier paper are separate ---");

{
  const a4p = getPaperSize("a4-portrait");
  const a4l = getPaperSize("a4-landscape");
  assert(!!a4p && a4p.widthMm === 210 && a4p.heightMm === 297, "A4 portrait is 210 × 297 mm in the paper registry");
  assert(!!a4l && a4l.widthMm === 297 && a4l.heightMm === 210, "A4 landscape is 297 × 210 mm in the paper registry");
  assert(a4p.orientation === "portrait" && a4l.orientation === "landscape", "A4 registry entries carry their own orientation");

  assert(
    !CHEQUE_SIZES.some((s) => s.widthMm === 210 && s.heightMm === 297),
    "no CHEQUE size entry is A4 — the carrier never becomes a cheque",
  );
  assert(
    PAPER_SIZES.every((p) => !CHEQUE_SIZES.some((c) => c.id === p.id)),
    "paper ids and cheque-size ids never collide",
  );

  const std = getChequeSize("standard-190x89");
  assert(!!std && std.widthMm === 190.5 && std.heightMm === 88.9, "the default reference cheque is 190.5 × 88.9 mm");
  assert(std.builtin === true, "the default reference size is built in");
}

// ---------------------------------------------------------------------------
// 2. Validation rejects every invalid dimension class
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: Invalid dimensions are rejected ---");

{
  const base = { id: "test-valid", label: "Test", widthMm: 190.5, heightMm: 88.9, builtin: false };
  assert(validateSize(base) === null, "a sane custom size validates clean");

  const bad = (label, patch) => validateSize({ ...base, ...patch }) !== null;
  assert(bad("zero width", { widthMm: 0 }), "zero width is rejected");
  assert(bad("zero height", { heightMm: 0 }), "zero height is rejected");
  assert(bad("negative width", { widthMm: -190.5 }), "negative width is rejected");
  assert(bad("negative height", { heightMm: -0.1 }), "negative height is rejected");
  assert(bad("NaN width", { widthMm: NaN }), "NaN width is rejected");
  assert(bad("NaN height", { heightMm: NaN }), "NaN height is rejected");
  assert(bad("Infinity width", { widthMm: Infinity }), "Infinity width is rejected");
  assert(bad("-Infinity height", { heightMm: -Infinity }), "-Infinity height is rejected");
  assert(bad("undefined width", { widthMm: undefined }), "undefined width is rejected");
  assert(bad("string width", { widthMm: "190.5" }), "a string width is rejected (no silent coercion)");
  assert(bad("null height", { heightMm: null }), "a null height is rejected");

  assert(!isValidSizeValue("190.5"), "isValidSizeValue rejects strings directly");
  assert(isValidSizeValue(88.9) && isValidSizeValue(210), "isValidSizeValue accepts real positive finite numbers");

  // Unit-mistake guard: a cheque entered in tenths of a millimetre.
  assert(
    validateSize({ ...base, widthMm: 1905, heightMm: 889 }) !== null,
    `a 1905 × 889 mm \"cheque\" is rejected as unreasonable (cap ${MAX_DIMENSION_MM} mm)`,
  );
  assert(
    validateSize({ ...base, widthMm: 501, heightMm: 88.9 }) !== null,
    "501 mm is over the cap and rejected",
  );
  assert(
    validateSize({ ...base, widthMm: 297, heightMm: 210 }) === null,
    "A4-magnitude paper-like sizes stay allowed (the cap is far above any real stock)",
  );
  assert(validateSize({ ...base, id: "Bad Id" }) !== null, "an id with spaces is rejected");
  assert(validateSize({ ...base, id: "" }) !== null, "an empty id is rejected");
}

{
  // The registry itself refuses to persist an invalid entry.
  let threw = false;
  try {
    upsertChequeSize(createCustomChequeSize("test-bad", "Bad", 0, -5));
  } catch {
    threw = true;
  }
  assert(threw, "upsertChequeSize throws on invalid dimensions instead of storing them");
  assert(getChequeSize("test-bad") === undefined, "the rejected size never entered the registry");
}

// ---------------------------------------------------------------------------
// 3. The default is a default — the engine is size-agnostic
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: The reference size is not an assumption ---");

{
  const std = getTemplate("siddhartha");
  assert(std.sizeId === "standard-190x89", "the seeded template references the registry by id");

  // A different registered size must resolve through the identical code path.
  const other = createCustomChequeSize("test-a5ish", "Test 148 × 210", 148, 210);
  upsertChequeSize(other);
  const alt = { ...structuredClone(std), id: "test-alt", sizeId: other.id, widthMm: 148, heightMm: 210 };
  const errs = validateBankTemplate(alt);
  assert(errs === null || !errs.some((e) => e.code === "SIZE_REGISTRY_MISMATCH"), "a template on a second registered size passes registry consistency");

  for (const t of [std, alt]) {
    const geom = resolvePrintGeometry(t, "custom_short");
    assert(
      geom.pageW === t.widthMm && geom.pageH === t.heightMm,
      `${t.widthMm} × ${t.heightMm}: direct-feed @page equals the template's own size`,
    );
  }

  const a4v = resolvePrintGeometry(alt, "a4_vertical");
  assert(a4v.pageW === 210 && a4v.pageH === 297, "the alt-size cheque still lands on a 210 × 297 carrier");
  assert(a4v.chequeW === 148 && a4v.chequeH === 210, "and keeps its own 148 × 210 mm on that carrier");
}

// ---------------------------------------------------------------------------
// 4. Orientation truth helpers
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Orientation derives from dimensions ---");

assert(orientationFor(190.5, 88.9) === "landscape", "190.5 × 88.9 is landscape");
assert(orientationFor(88.9, 190.5) === "portrait", "88.9 × 190.5 is portrait");
assert(orientationMatchesSize(190.5, 88.9, "landscape"), "orientationMatchesSize agrees for landscape");
assert(!orientationMatchesSize(190.5, 88.9, "portrait"), "orientationMatchesSize rejects the mismatch");
assert(!orientationMatchesSize(NaN, 88.9, "landscape"), "orientationMatchesSize is safe against NaN");

// ---------------------------------------------------------------------------
// 5. Mode presentation is derived, not duplicated
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: Labels derive from the registry ---");

{
  // The workspace must not carry a second hard-coded orientation table. The
  // exported printModeInfo() function is the derived replacement.
  const ws = fs.readFileSync("components/Workspace.tsx", "utf8");
  assert(
    /export function printModeInfo/.test(ws),
    "Workspace exports printModeInfo() as the derived mode-description helper",
  );
  assert(
    !/orientation:\s*"(Landscape|Portrait)"/.test(ws),
    "no hard-coded orientation string table remains in the workspace",
  );
  assert(
    /getPaperSize\(paperId\)/.test(ws),
    "printModeInfo reads the paper registry rather than restating dimensions",
  );
}

console.log("\n=== SIZE SYSTEM TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome size-system tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll size-system tests PASSED.");
}
