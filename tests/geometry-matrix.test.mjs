// ---------------------------------------------------------------------------
// Geometry matrix tests.
//
// The engine must handle ANY cheque width × height in millimetres with a
// declared orientation — not just the 190.5 × 88.9 mm stock the app ships with.
// These tests exercise a landscape size, a portrait size and the standard size
// across every print mode, and prove that:
//
//   - the @page box is derived from the declared physical size;
//   - the cheque keeps its own size on the A4 carrier (it is not stretched);
//   - orientation is truthful (a "portrait" template with landscape geometry is
//     rejected) and never rotates content;
//   - calibration moves the output within limits and never resizes it;
//   - printable fields never enter the reserved MICR band.
// ---------------------------------------------------------------------------

import { getTemplate, getAllTemplates } from "../lib/templates.ts";
import { DIRECT_FEED_MODES, A4_CARRIER_MODES, isDirectFeed } from "../lib/types.ts";
import {
  A4_PORTRAIT_W_MM,
  A4_PORTRAIT_H_MM,
  A4_LANDSCAPE_W_MM,
  A4_LANDSCAPE_H_MM,
  calibrationLimits,
  carrierFits,
  resolveCalibratedGeometry,
  resolvePaper,
  resolvePrintGeometry,
  rotatedContentOffset,
} from "../lib/printGeometry.ts";
import {
  validateBankTemplate,
  validateCalibratedBounds,
  validatePrintGeometry,
  validateSafeZoneClearance,
} from "../lib/validation.ts";
import { createCustomChequeSize, orientationFor, orientationMatchesSize, upsertChequeSize, resetChequeSizes } from "../lib/sizes.ts";
import { micrSafeZone, MICR_BAND_MM } from "../data/templates.ts";
import { computeSheetLayout, fieldsWithinCheque } from "../lib/sheetLayout.ts";

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

const MODES = ["custom_short", "custom_long", "a4_vertical", "a4_horizontal"];
const sampleData = {
  date: "2026-09-17",
  payee: "Ram Bahadur Thapa",
  amount: "125000.50",
  amountWords: "",
  accountPayee: true,
};

console.log("=== GEOMETRY MATRIX TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. Every shipped template × every mode
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Shipped templates × modes ---");

for (const template of getAllTemplates()) {
  for (const mode of MODES) {
    const geom = resolvePrintGeometry(template, mode);
    const geomErrors = validatePrintGeometry(geom, template, mode);
    assert(geomErrors === null, `${template.id} ${mode}: geometry validates clean`);
    assert(
      Math.abs(geom.chequeW - template.widthMm) < 0.001 && Math.abs(geom.chequeH - template.heightMm) < 0.001,
      `${template.id} ${mode}: cheque keeps its declared physical size (${template.widthMm}×${template.heightMm})`,
    );
    assert(geom.containerW === geom.pageW && geom.containerH === geom.pageH, `${template.id} ${mode}: container equals @page box`);
    assert(geom.rotate === undefined, `${template.id} ${mode}: no rotation field (feed direction is a printer setting)`);
    const offset = rotatedContentOffset(geom);
    assert(offset.leftMm === 0 && offset.topMm === 0, `${template.id} ${mode}: no rotation offset`);
    assert(validateCalibratedBounds(template, mode) === null, `${template.id} ${mode}: base placement is calibration-safe`);
    assert(carrierFits(template, mode), `${template.id} ${mode}: cheque physically fits the carrier`);
  }

  for (const mode of DIRECT_FEED_MODES) {
    const geom = resolvePrintGeometry(template, mode);
    assert(
      geom.pageW === template.widthMm && geom.pageH === template.heightMm,
      `${template.id} ${mode}: @page is the cheque itself (${template.widthMm}×${template.heightMm})`,
    );
    assert(geom.chequeX === 0 && geom.chequeY === 0, `${template.id} ${mode}: direct feed places the cheque at the origin`);
  }

  const a4v = resolvePrintGeometry(template, "a4_vertical");
  const a4h = resolvePrintGeometry(template, "a4_horizontal");
  assert(a4v.pageW === A4_PORTRAIT_W_MM && a4v.pageH === A4_PORTRAIT_H_MM, `${template.id}: A4 portrait carrier is 210×297 mm`);
  assert(a4h.pageW === A4_LANDSCAPE_W_MM && a4h.pageH === A4_LANDSCAPE_H_MM, `${template.id}: A4 landscape carrier is 297×210 mm`);
  assert(resolvePaper(template, "a4_vertical").id === "a4-portrait", `${template.id}: carrier paper comes from the paper registry`);
  assert(resolvePaper(template, "custom_short").isChequeStock === true, `${template.id}: direct feed prints on the cheque stock itself`);
}

// ---------------------------------------------------------------------------
// 2. Arbitrary sizes — an admin-defined landscape and portrait cheque
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: Arbitrary admin-defined cheque sizes ---");

const base = getTemplate("siddhartha");

const LANDSCAPE_SIZE = createCustomChequeSize("test-204x92", "Test landscape 204 × 92", 204, 92);
const PORTRAIT_SIZE = createCustomChequeSize("test-92x204", "Test portrait 92 × 204", 92, 204);
upsertChequeSize(LANDSCAPE_SIZE);
upsertChequeSize(PORTRAIT_SIZE);

function templateForSize(size, orientation, overrides = {}) {
  const t = structuredClone(base);
  t.id = `test-${size.id}`;
  t.sizeId = size.id;
  t.widthMm = size.widthMm;
  t.heightMm = size.heightMm;
  t.orientation = orientation;
  t.label = `${size.widthMm} × ${size.heightMm} ${orientation}`;
  t.profiles.custom_short = { x: 0, y: 0, pageWidth: size.widthMm, pageHeight: size.heightMm };
  t.profiles.custom_long = { x: 0, y: 0, pageWidth: size.widthMm, pageHeight: size.heightMm };
  // Keep every field inside the new box and below the reserved band. The clone
  // adapts Siddhartha's landscape coordinates, so on portrait stock a field's
  // WIDTH must also be re-fitted, not just its position — a real portrait
  // template would be authored from scratch with correct widths.
  for (const field of Object.values(t.fields)) {
    if (field.kind === "ac-payee") field.width = size.widthMm;
    if (field.kind === "words") field.width = Math.min(field.width, size.widthMm - field.x - 2);
    if (field.kind === "signature") field.y = size.heightMm - MICR_BAND_MM - 8;
    if (field.kind === "amount") field.y = Math.min(field.y, size.heightMm - MICR_BAND_MM - 8);
    field.width = Math.min(field.width, size.widthMm - 1);
    if (field.x + field.width > size.widthMm) field.x = Math.max(0, size.widthMm - field.width - 1);
  }
  t.safeZones = [micrSafeZone(size.widthMm, size.heightMm)];
  t.profiles.a4_vertical = { x: 3, y: 20, pageWidth: A4_PORTRAIT_W_MM, pageHeight: A4_PORTRAIT_H_MM };
  t.profiles.a4_horizontal = { x: 40, y: 3, pageWidth: A4_LANDSCAPE_W_MM, pageHeight: A4_LANDSCAPE_H_MM };
  return Object.assign(t, overrides);
}

const landscapeTemplate = templateForSize(LANDSCAPE_SIZE, "landscape");
const portraitTemplate = templateForSize(PORTRAIT_SIZE, "portrait");

for (const template of [landscapeTemplate, portraitTemplate]) {
  const errs = validateBankTemplate(template);
  assert(errs === null, `${template.id}: arbitrary-size template validates clean`);
  assert(validateSafeZoneClearance(template).length === 0, `${template.id}: no printable field enters the reserved band`);

  for (const mode of MODES) {
    const geom = resolvePrintGeometry(template, mode);
    assert(validatePrintGeometry(geom, template, mode) === null, `${template.id} ${mode}: geometry validates clean`);

    if (isDirectFeed(mode)) {
      assert(geom.pageW === template.widthMm && geom.pageH === template.heightMm, `${template.id} ${mode}: page box is the declared size`);
    } else {
      const paper = resolvePaper(template, mode);
      assert(
        geom.pageW === paper.widthMm && geom.pageH === paper.heightMm,
        `${template.id} ${mode}: page box is the carrier paper (${paper.widthMm}×${paper.heightMm})`,
      );
    }

    if (isDirectFeed(mode)) {
      assert(
        geom.paperW === template.widthMm && geom.paperH === template.heightMm,
        `${template.id} ${mode}: cheque stock is not swapped or rotated`,
      );
    } else {
      assert(
        geom.chequeW === template.widthMm && geom.chequeH === template.heightMm,
        `${template.id} ${mode}: the cheque is NOT stretched to the carrier`,
      );
      assert(geom.pageW >= geom.chequeW && geom.pageH >= geom.chequeH, `${template.id} ${mode}: carrier is at least as large as the cheque`);
    }
  }
}

{
  const geom = resolvePrintGeometry(landscapeTemplate, "custom_short");
  assert(geom.pageW === 204 && geom.pageH === 92, "custom landscape size yields a 204 × 92 mm @page");
  assert(geom.chequeOrientation === "landscape" && geom.pageOrientation === "landscape", "landscape orientation reported for the page and cheque");
}

{
  const geom = resolvePrintGeometry(portraitTemplate, "custom_short");
  assert(geom.pageW === 92 && geom.pageH === 204, "custom portrait size yields a 92 × 204 mm @page (nothing swapped)");
  assert(geom.chequeOrientation === "portrait", "portrait orientation is carried through to the geometry");
  const a4v = resolvePrintGeometry(portraitTemplate, "a4_vertical");
  assert(a4v.pageW === 210 && a4v.pageH === 297, "a portrait cheque still prints on an A4 portrait carrier");
  assert(a4v.chequeW === 92 && a4v.chequeH === 204, "portrait cheque keeps 92 × 204 mm on the carrier");
}

{
  const layout = computeSheetLayout(portraitTemplate, sampleData, "a4_vertical", { x: 0, y: 0 });
  assert(layout.orientation === "portrait", "sheet layout reports the declared orientation");
  assert(
    layout.fields.every((f) => f.yMm + f.heightMm <= layout.chequeY + layout.chequeH + 0.05),
    "no field is laid out past the cheque's bottom edge",
  );
  assert(layout.fields.filter((f) => f.printable && f.text).length > 0, "portrait layout renders its fields");
}

// ---------------------------------------------------------------------------
// 3. Orientation truthfulness and size-registry agreement
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: Orientation and registry agreement ---");

assert(orientationFor(190.5, 88.9) === "landscape", "wide stock is landscape");
assert(orientationFor(88.9, 190.5) === "portrait", "tall stock is portrait");
assert(orientationMatchesSize(190.5, 88.9, "landscape") && !orientationMatchesSize(190.5, 88.9, "portrait"), "mismatched orientation is detected");

{
  const lying = { ...structuredClone(base), orientation: "portrait" };
  const errs = validateBankTemplate(lying);
  assert(errs !== null && errs.some((e) => e.code === "ORIENTATION_MISMATCH"), "a landscape template claiming portrait is rejected");
}

{
  const drifting = { ...structuredClone(base), widthMm: 210 };
  const errs = validateBankTemplate(drifting);
  assert(errs !== null && errs.some((e) => e.code === "SIZE_REGISTRY_MISMATCH"), "dimensions that drift from the size registry are rejected");
}

{
  const unknown = { ...structuredClone(base), sizeId: "no-such-size" };
  const errs = validateBankTemplate(unknown);
  assert(errs !== null && errs.some((e) => e.code === "SIZE_UNKNOWN"), "an unregistered cheque size is rejected");
}

{
  const noZones = { ...structuredClone(base), safeZones: [] };
  assert(validateBankTemplate(noZones) === null, "reserved zones are optional (a template may define none)");
}

// ---------------------------------------------------------------------------
// 4. Reserved zone enforcement
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Reserved MICR band ---");

{
  const invading = structuredClone(base);
  invading.fields.amount = { ...invading.fields.amount, y: invading.heightMm - MICR_BAND_MM + 1 };
  const errs = validateBankTemplate(invading);
  assert(errs !== null && errs.some((e) => e.code === "SAFE_ZONE_OVERLAP"), "a printable field inside the MICR band is rejected");
  assert(validateSafeZoneClearance(invading).length > 0, "safe-zone clearance reports the overlap for the print gate");
}

{
  const outOfBounds = structuredClone(base);
  outOfBounds.safeZones = [{ id: "micr", label: "band", x: 0, y: 60, width: 400, height: 20 }];
  const errs = validateBankTemplate(outOfBounds);
  assert(errs !== null && errs.some((e) => e.code === "SAFE_ZONE_OUT_OF_BOUNDS"), "a reserved zone larger than the cheque is rejected");
}

{
  const signatureInBand = structuredClone(base);
  signatureInBand.fields.sig1 = { ...signatureInBand.fields.sig1, y: signatureInBand.heightMm - 4, height: 3 };
  assert(
    validateBankTemplate(signatureInBand) === null,
    "screen-only signature placeholders are exempt from the reserved-band rule (they are never printed)",
  );
}

// ---------------------------------------------------------------------------
// 5. Calibration: limits, clamping, axis isolation, size invariance
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: Calibration behaviour ---");

for (const template of [landscapeTemplate, portraitTemplate, base]) {
  for (const mode of MODES) {
    const limits = calibrationLimits(template, mode);
    const positive = resolveCalibratedGeometry(template, mode, { x: 25, y: 25 });
    const negative = resolveCalibratedGeometry(template, mode, { x: -25, y: -25 });
    assert(
      positive.finalChequeX >= -0.05 && positive.finalChequeX + template.widthMm <= positive.pageW + 0.05,
      `${template.id} ${mode}: +25 mm X stays on the paper`,
    );
    assert(
      positive.finalChequeY >= -0.05 && positive.finalChequeY + template.heightMm <= positive.pageH + 0.05,
      `${template.id} ${mode}: +25 mm Y stays on the paper`,
    );
    assert(
      negative.finalChequeX >= -0.05 && negative.finalChequeY >= -0.05,
      `${template.id} ${mode}: −25 mm stays on the paper`,
    );
    assert(
      positive.chequeW === template.widthMm && positive.chequeH === template.heightMm,
      `${template.id} ${mode}: calibration does not resize the cheque`,
    );
    if (isDirectFeed(mode)) {
      assert(
        positive.finalChequeX === 0 && positive.finalChequeY === 0,
        `${template.id} ${mode}: direct-feed calibration shifts content, not the page box`,
      );
    } else {
      assert(limits.maxX > 0 || limits.minX < 0, `${template.id} ${mode}: carrier offers calibration headroom`);
    }
  }
}

{
  const layout = computeSheetLayout(base, sampleData, "a4_vertical", { x: 3, y: -2 });
  const shift = { x: layout.calibration.x, y: layout.calibration.y };
  assert(shift.x === 3 && shift.y === -2, "the applied calibration is reported back by the layout");
  assert(Math.abs(layout.chequeX - (base.profiles.a4_vertical.x + 3)) < 0.001, "carrier calibration translates the cheque horizontally by exactly the requested amount");
  assert(Math.abs(layout.chequeY - (base.profiles.a4_vertical.y - 2)) < 0.001, "carrier calibration translates the cheque vertically by exactly the requested amount");
  {
    const date = layout.fields.find((f) => f.key === "date");
    const neutral = computeSheetLayout(base, sampleData, "a4_vertical", { x: 0, y: 0 }).fields.find((f) => f.key === "date");
    assert(Math.abs(date.xMm - (neutral.xMm + 3)) < 0.001, "carrier calibration moves the rendered content with the cheque");
    assert(Math.abs(date.yMm - (neutral.yMm - 2)) < 0.001, "carrier Y calibration moves the rendered content with the cheque");
  }
}

{
  const clamped = computeSheetLayout(base, sampleData, "a4_vertical", { x: 25, y: 0 });
  assert(clamped.clamped === true, "over-range calibration is reported as clamped");
  assert(
    clamped.calibration.x < 25 && clamped.calibration.x > 0,
    `clamping keeps the cheque on the paper (applied X = ${clamped.calibration.x} mm, not 25)`,
  );
}

// ---------------------------------------------------------------------------
// 5b. Portrait readiness — rotation-free, axis-pure, on the standard twin
//
// No real portrait cheque template ships yet (the catalogue only has real
// geometry for landscape stock). These tests prove the PIPELINE is
// portrait-ready so that entering a real portrait cheque's measurements later
// is a data change, not an engine change.
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5b: Portrait readiness (synthetic sizes) ---");

{
  // The portrait twin of the shipped standard stock, plus a second arbitrary
  // portrait size — two different aspect ratios, both taller than wide.
  const PORTRAIT_TWIN = createCustomChequeSize("test-88x190", "Test portrait twin 88.9 × 190.5", 88.9, 190.5);
  upsertChequeSize(PORTRAIT_TWIN);
  const twin = templateForSize(PORTRAIT_TWIN, "portrait");

  assert(validateBankTemplate(twin) === null, "portrait twin template validates clean against the registry");
  assert(orientationFor(88.9, 190.5) === "portrait", "the twin's dimensions resolve as portrait");

  for (const mode of MODES) {
    const geom = resolvePrintGeometry(twin, mode);
    const offset = rotatedContentOffset(geom);
    assert(offset.leftMm === 0 && offset.topMm === 0, `portrait twin ${mode}: content offset is exactly zero (no rotation, no double rotation)`);
    if (isDirectFeed(mode)) {
      assert(geom.pageW === 88.9 && geom.pageH === 190.5, `portrait twin ${mode}: @page is 88.9 × 190.5 mm, nothing swapped`);
    }
  }

  // Axis isolation: on the carrier, X must move only X and Y only Y — for a
  // portrait cheque this is where a rotation bug would show up first.
  const neutral = computeSheetLayout(twin, sampleData, "a4_vertical", { x: 0, y: 0 });
  const movedX = computeSheetLayout(twin, sampleData, "a4_vertical", { x: 0.5, y: 0 });
  const movedY = computeSheetLayout(twin, sampleData, "a4_vertical", { x: 0, y: 0.5 });
  const dateN = neutral.fields.find((f) => f.key === "date");
  const dateX = movedX.fields.find((f) => f.key === "date");
  const dateY = movedY.fields.find((f) => f.key === "date");
  assert(Math.abs(dateX.xMm - dateN.xMm - 0.5) < 0.001 && Math.abs(dateX.yMm - dateN.yMm) < 0.001, "portrait twin: +0.5 mm X moves the field horizontally only");
  assert(Math.abs(dateY.yMm - dateN.yMm - 0.5) < 0.001 && Math.abs(dateY.xMm - dateN.xMm) < 0.001, "portrait twin: +0.5 mm Y moves the field vertically only");

  const calibrated = resolveCalibratedGeometry(twin, "a4_vertical", { x: 10, y: -10 });
  assert(calibrated.chequeW === twin.widthMm && calibrated.chequeH === twin.heightMm, "portrait twin: calibration never resizes the cheque");

  // Fields stay inside the tall box for every mode.
  for (const mode of MODES) {
    const layout = computeSheetLayout(twin, sampleData, mode, { x: 0, y: 0 });
    assert(fieldsWithinCheque(layout), `portrait twin ${mode}: every printable field stays inside the cheque box`);
  }
}

// ---------------------------------------------------------------------------
// 6. Cleanup
// ---------------------------------------------------------------------------
resetChequeSizes();
assert(orientationMatchesSize(190.5, 88.9, "landscape"), "size registry restored after the test run");

console.log("\n=== GEOMETRY MATRIX SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome geometry matrix tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll geometry matrix tests PASSED.");
}
