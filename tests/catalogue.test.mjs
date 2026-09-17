// ---------------------------------------------------------------------------
// Catalogue tests — banks, cheque templates and the links between them.
//
//   Bank (institution)  ──1:N──▶  ChequeTemplate
//
// The important guarantees: template -> bank is authoritative, bank.templateIds
// is derived, a bank is never shown with a template that does not exist, and no
// template claims verification it has not earned.
// ---------------------------------------------------------------------------

import { BANK_LIST, CATALOGUE_REVISION, BANK_GROUPS } from "../data/banks.ts";
import { TEMPLATE_SEEDS, MICR_BAND_MM } from "../data/templates.ts";
import { getAllTemplates, getTemplate, getTemplateForBank, getTemplatesForBankId } from "../lib/templates.ts";
import {
  formatBankLabel,
  getBank,
  getBankForTemplate,
  getBankGroups,
  getBankOptions,
  getBanks,
  getCatalogueSummary,
  getPendingBanks,
  getSelectableBanks,
  getTemplatesForBank,
  isBankEnabled,
} from "../lib/catalogue.ts";
import { validateBank, validateBankTemplate, validateCatalogue } from "../lib/validation.ts";
import { CHEQUE_SIZES, PAPER_SIZES, getChequeSize, orientationMatchesSize } from "../lib/sizes.ts";

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

console.log("=== CATALOGUE TESTS ===\n");

// ---------------------------------------------------------------------------
// 1. Bank catalogue integrity
// ---------------------------------------------------------------------------
console.log("--- SECTION 1: Bank catalogue ---");

assert(BANK_LIST.length >= 50, `bank catalogue is substantial (${BANK_LIST.length} institutions)`);
assert(validateCatalogue(BANK_LIST, getAllTemplates()) === null, "built-in bank + template catalogue is internally consistent");
assert(BANK_LIST.every((b) => validateBank(b) === null), "every seeded bank entry passes validation");

{
  const ids = new Set();
  let duplicates = 0;
  for (const bank of BANK_LIST) {
    if (ids.has(bank.id)) duplicates++;
    ids.add(bank.id);
  }
  assert(duplicates === 0, "bank ids are unique");
}

{
  const classes = new Set(BANK_LIST.map((b) => b.nrbClass));
  assert(classes.has("A") && classes.has("B") && classes.has("C") && classes.has("D"), "all four NRB classes are populated");
  assert(BANK_GROUPS.length === 4, "catalogue exposes four NRB class groups");
}

{
  const merged = BANK_LIST.filter((b) => b.status === "merged");
  assert(merged.length >= 5, `merged institutions are retained for old cheques (${merged.length})`);
  for (const bank of merged) {
    assert(
      !!BANK_LIST.find((b) => b.id === bank.supersededBy),
      `${bank.id}: merged bank points at a real successor (${bank.supersededBy})`,
    );
  }
}

assert(
  BANK_LIST.every((b) => b.verifiedAt === undefined),
  "no bank claims NRB verification it has not received (verifiedAt only set by an administrator)",
);
assert(typeof CATALOGUE_REVISION === "string" && /^\d{4}-\d{2}-\d{2}$/.test(CATALOGUE_REVISION), "catalogue revision is dated");

// ---------------------------------------------------------------------------
// 2. Bank <-> template links are derived, never hand-maintained
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 2: Derived bank/template links ---");

for (const template of getAllTemplates()) {
  const bank = getBankForTemplate(template.id);
  assert(!!bank, `${template.id}: owning bank resolves (${template.bankId})`);
  assert(
    (bank?.templateIds ?? []).includes(template.id),
    `${template.id}: appears in its bank's derived templateIds`,
  );
  assert(validateBankTemplate(template) === null, `${template.id}: template validates clean`);
  assert(getTemplateForBank(template.bankId, template.id)?.id === template.id, `${template.id}: resolvable by (bank, template)`);
  assert(getTemplateForBank("nabil", template.id)?.id !== template.id || template.bankId === "nabil", `${template.id}: never served under another bank`);
}

{
  const emptyDeclared = getBanks().filter((b) => getTemplatesForBank(b.id).length === 0);
  assert(emptyDeclared.every((b) => b.templateIds.length === 0), "banks with no templates advertise none");
  const withTemplates = getSelectableBanks();
  assert(withTemplates.length > 0, `selectable banks exist (${withTemplates.map((b) => b.id).join(", ")})`);
  assert(withTemplates.every((b) => getTemplatesForBank(b.id).length > 0), "every selectable bank has at least one template");
  assert(withTemplates.every((b) => b.enabled), "every selectable bank is enabled");
}

{
  const pending = getPendingBanks();
  assert(pending.length > 0, `banks awaiting a template are tracked separately (${pending.length})`);
  assert(pending.every((b) => b.templateIds.length === 0), "pending banks really have no template");
  const options = getBankOptions();
  assert(options.length === getBanks().filter((b) => b.enabled).length, "bank options cover every enabled bank");
  assert(
    options.filter((o) => !o.hasTemplate).every((o) => o.label.includes("template pending")),
    "banks without a template are labelled 'template pending' rather than omitted",
  );
}

// ---------------------------------------------------------------------------
// 3. Template metadata
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 3: Template metadata ---");

assert(TEMPLATE_SEEDS.length === 5, `five seeded templates (${TEMPLATE_SEEDS.map((t) => t.id).join(", ")})`);
assert(getAllTemplates().length === TEMPLATE_SEEDS.length, "runtime store starts from the seeded templates");

for (const template of getAllTemplates()) {
  assert(typeof template.bankId === "string" && template.bankId.length > 0, `${template.id}: declares its bank`);
  assert(typeof template.label === "string" && template.label.length > 0, `${template.id}: has a layout label`);
  assert(["portrait", "landscape"].includes(template.orientation), `${template.id}: declares an orientation`);
  assert(
    orientationMatchesSize(template.widthMm, template.heightMm, template.orientation),
    `${template.id}: orientation agrees with its physical dimensions`,
  );
  assert(!!getChequeSize(template.sizeId), `${template.id}: references a registered cheque size (${template.sizeId})`);
  const size = getChequeSize(template.sizeId);
  assert(
    size.widthMm === template.widthMm && size.heightMm === template.heightMm,
    `${template.id}: dimensions match the size registry exactly`,
  );
  assert(
    (template.safeZones ?? []).some((z) => z.id === "micr"),
    `${template.id}: reserves the MICR band`,
  );
  const micr = (template.safeZones ?? []).find((z) => z.id === "micr");
  assert(
    Math.abs(micr.height - MICR_BAND_MM) < 0.001 && Math.abs(micr.y - (template.heightMm - MICR_BAND_MM)) < 0.001,
    `${template.id}: MICR band is the bottom ${MICR_BAND_MM} mm of the cheque`,
  );
  assert(
    Object.values(template.fields).every((f) => typeof f.label === "string" && f.label.length > 0 && typeof f.kind === "string"),
    `${template.id}: every field carries its own label and kind (no hardcoded field list)`,
  );
  assert(
    Object.values(template.fields).every((f) => f.key && template.fields[f.key] === f),
    `${template.id}: field keys agree with their map keys`,
  );
}

{
  const siddhartha = getTemplate("siddhartha");
  assert(siddhartha.verification.status === "browser-verified", "Siddhartha is browser verified");
  assert(!!siddhartha.verification.verifiedAt, "browser verification is dated");
  assert(
    siddhartha.verification.status !== "physically-calibrated",
    "Siddhartha is NOT claimed as physically calibrated before a printer test",
  );
  const unverified = getAllTemplates().filter((t) => t.verification.status === "unverified");
  assert(unverified.length === 4, `the four cloned layouts are honestly marked unverified (${unverified.length})`);
}

// ---------------------------------------------------------------------------
// 4. Registries
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 4: Size and paper registries ---");

assert(CHEQUE_SIZES.length >= 1 && CHEQUE_SIZES[0].id === "standard-190x89", "standard cheque size is registered centrally");
assert(PAPER_SIZES.length === 2, "A4 portrait and landscape papers are registered");
assert(
  PAPER_SIZES.find((p) => p.id === "a4-portrait").widthMm === 210 && PAPER_SIZES.find((p) => p.id === "a4-portrait").heightMm === 297,
  "A4 portrait is 210 × 297 mm",
);
assert(
  PAPER_SIZES.find((p) => p.id === "a4-landscape").widthMm === 297 && PAPER_SIZES.find((p) => p.id === "a4-landscape").heightMm === 210,
  "A4 landscape is 297 × 210 mm",
);

// ---------------------------------------------------------------------------
// 5. Summary + labels
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 5: Summary and labels ---");

{
  const summary = getCatalogueSummary();
  assert(summary.bankCount === BANK_LIST.length, "summary counts every catalogue bank");
  assert(summary.templateCount === getAllTemplates().length, "summary counts every template");
  assert(summary.banksWithTemplates + summary.banksPending === summary.bankCount, "summary partitions banks by template availability");
  assert(summary.physicallyCalibratedCount === 0, "no template claims physical calibration yet");
}

{
  const merged = BANK_LIST.find((b) => b.status === "merged");
  assert(formatBankLabel(merged).includes("merged into"), "merged banks are labelled with their successor");
  assert(formatBankLabel(BANK_LIST.find((b) => b.status === "active")).includes("merged") === false, "active banks are labelled plainly");
}

{
  assert(isBankEnabled("siddhartha"), "seeded banks are enabled by default");
  const groups = getBankGroups();
  assert(groups.every((g) => Array.isArray(g.banks) && g.banks.length > 0), "every NRB class group lists its banks");
  assert(getTemplatesForBankId("siddhartha").length >= 1, "templates can be listed by bank id without a bank lookup");
}

// ---------------------------------------------------------------------------
// 6. Invalid catalogue entries are rejected
// ---------------------------------------------------------------------------
console.log("\n--- SECTION 6: Rejection of invalid catalogue entries ---");

{
  assert(validateBank({ ...BANK_LIST[0], nrbClass: "Z" }) !== null, "unknown NRB class rejected");
  assert(validateBank({ ...BANK_LIST[0], status: "closed" }) !== null, "unknown status rejected");
  assert(validateBank({ ...BANK_LIST[0], name: "  " }) !== null, "empty bank name rejected");
  assert(validateBank({ ...BANK_LIST[0], id: "Not A Slug" }) !== null, "non-slug bank id rejected");
  assert(validateBank({ ...BANK_LIST[0], enabled: "yes" }) !== null, "non-boolean enabled flag rejected");
  assert(validateBank({ ...BANK_LIST[0], status: "merged", supersededBy: undefined }) !== null, "merged bank without a successor rejected");
  assert(validateBank({ ...BANK_LIST[0], verifiedAt: "17-09-2026" }) !== null, "non-ISO verification date rejected");

  const orphan = { ...getTemplate("siddhartha"), bankId: "does-not-exist" };
  assert(validateCatalogue(BANK_LIST, [orphan]) !== null, "template belonging to an unknown bank is rejected");

  const dupe = [...BANK_LIST, BANK_LIST[0]];
  assert(validateCatalogue(dupe, getAllTemplates()) !== null, "duplicate bank id is rejected");

  const mismatched = BANK_LIST.map((b) => (b.id === "nabil" ? { ...b, templateIds: ["siddhartha"] } : b));
  assert(validateCatalogue(mismatched, getAllTemplates()) !== null, "bank claiming another bank's template is rejected");
}

console.log("\n=== CATALOGUE TEST SUMMARY ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) {
  console.error("\nSome catalogue tests FAILED.");
  process.exit(1);
} else {
  console.log("\nAll catalogue tests PASSED.");
}
