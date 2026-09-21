# Phase 0 Research: Cheque Form & Print Preview

**Feature**: Cheque Form & Print Preview (`001-cheque-form-preview`)
**Date**: 2026-09-17
**Status**: Complete — all unknowns resolved

---

## Research Questions

### RQ-1: How does the print pipeline ensure @page size matches the rendered container?

**Findings**: 
- `src/lib/printGeometry.ts` → `resolvePrintGeometry(template, mode)` is the **single source of truth**.
- It computes `pageW`, `pageH` (for `@page` size) and `containerW`, `containerH` (for the print container) from the **same** values.
- In `Workspace.tsx` `handlePrint()` (line ~1522), an inline `<style>` is injected before `window.print()`:
  ```css
  @page { size: {geom.pageW}mm {geom.pageH}mm; margin: 0; }
  @media print { .{containerSelector} { width: {geom.containerW}mm !important; height: {geom.containerH}mm !important; } }
  ```
- The static `src/app/print.css` uses `size: auto` as a fallback — it is **overridden** at print time by the injected rule.
- A **duplicate-print guard** (`printLockRef`) prevents double invocation.
- `beforeprint`/`afterprint`/`pagehide` event listeners sync the print DOM to current state and clean up injected styles after printing.

**Decision**: Retain the JS-injected `@page` pattern. It is the correct approach because page size varies by bank template + print mode and cannot be static in CSS.

**Rationale**: Static `@page` rules cannot vary per template/mode. Injecting at print time ensures the page box matches the rendered container exactly.

**Alternatives considered**: Static `@page` in `print.css` — rejected because it cannot adapt to different bank templates or print modes (Direct Feed vs A4 Carrier).

---

### RQ-2: How are Direct Feed and A4 Carrier modes differentiated, and why is no CSS rotation used?

**Findings**:
- `isDirectFeed(mode)` checks if mode ∈ {`custom_short`, `custom_long`}.
- **Direct Feed**: `@page` = cheque physical size (190.5 × 88.9 mm). Content rendered **unrotated** — cheque coordinate system (origin top-left, X right, Y down) maps directly onto the landscape page box. Short Edge First vs Long Edge First is a **printer paper-feed setting** (selected in the printer driver), NOT a CSS transform.
- **A4 Carrier**: `@page` = A4 (210×297 portrait or 297×210 landscape). Cheque inset at `profile.x/y` + calibration.
- `resolveCalibratedGeometry()` clamps A4 calibration so the cheque never leaves the page.
- `rotatedContentOffset()` is a no-op (returns `{leftMm: 0, topMm: 0}`) — kept for backward compatibility.

**Decision**: No CSS rotation for Direct Feed. Content is flat in a landscape 190.5×88.9 mm page box.

**Rationale**: Chrome print preview shows a landscape cheque with horizontally-readable text. CSS rotation would cause the preview to show rotated content, confusing users. Feed direction is hardware-controlled.

**Alternatives considered**: CSS `transform: rotate(90deg)` with swapped page dimensions — rejected because it causes Chrome to show rotated, hard-to-read preview content.

---

### RQ-3: How does number-to-words conversion work and what numbering system is used?

**Findings**:
- `src/lib/amountWords.ts` → `integerToWords()` implements the **Nepali numbering hierarchy**: Kharab (10^12), Arab (10^9), Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2).
- Money is stored as **integer paisa** (1 NPR = 100 paisa). E.g., 100.50 NPR → 10050 paisa. The only `parseFloat` usage is inside the regex-anchored parser.
- `amountToWordsFromPaisa(amountPaisa)`: splits into rupees/paisa, produces `"X Rupees and Y Paisa Only"`.
- `checkAmountWordsConsistency(amount, words)`: case-insensitive, whitespace-normalized comparison to prevent printing when numeric and words don't match.
- `generateAmountWords(amount)`: returns canonical words for a valid amount, `""` for invalid/zero.
- The shared code snippet's `convertToWordsNepali()` only handles up to Crore (missing Kharab/Arab) and doesn't handle the "One Rupees" edge case (should be "One Rupee" grammatically, but the existing implementation accepts "One Rupees" for consistency).

**Decision**: Use the existing `src/lib/amountWords.ts` implementation with the full Nepali hierarchy (Kharab, Arab, Crore, Lakh, Thousand, Hundred) and integer paisa storage.

**Rationale**: Prevents floating-point errors. Supports amounts up to 999,999,999,999.99 NPR (MAX_AMOUNT_PAISA). Consistency check prevents print of mismatched amount/words.

**Alternatives considered**: Floating-point math for rupees — rejected due to accumulated rounding errors. Simpler Lakh/Crore-only hierarchy (like the snippet) — rejected as insufficient for large Nepali cheque amounts.

---

### RQ-4: How does the print-readiness gate work and what validations are applied?

**Findings**:
- `Workspace.tsx` `handlePrint()` (line ~1437) applies a **sequential validation** with early return on each failure:
  1. Date valid (not future) → `validateChequeDate(date)`
  2. Payee valid → `validatePayee(payee)` (trims, collapses spaces, rejects emoji, ≤120 chars)
  3. Amount valid → `validateAmount(amount)` (strict parser)
  4. Amount > 0
  5. Amount words non-empty
  6. Amount words consistent → `checkAmountWordsConsistency(amount, amountWords)`
  7. Template selected
  8. Print mode selected
  9. Calibration pair valid → `validateCalibrationPair(cal.x, cal.y)` (finite, ±25mm)
  10. Profile exists for mode
  11. Geometry valid → `validatePrintGeometry(geom, template, mode)` (NaN/Infinity, page-container agreement, A4 cheque-on-page)
  12. Calibrated bounds valid → `validateCalibratedBounds(template, mode)` (cheque stays on-page at max calibration)
- Each failure sets `printError` with a user-facing message and returns early.
- `printReadiness` useMemo provides the **single source of truth** for the disabled reason on the Print button.
- `derivedFormState` useMemo drives the workflow state badge: empty → template-selected → data-entering → ready-print → printing → done.

**Decision**: Keep the sequential gate pattern with the print-button-readiness reason surfaced to the user.

**Rationale**: Each guard returns early with a specific error message, giving actionable feedback. The `printReadiness` reason is displayed on the Print button so users know exactly what to fix.

**Alternatives considered**: Single combined validation function — rejected because individual error messages are lost (harder to diagnose).

---

### RQ-5: How does calibration work and is it scoped per mode?

**Findings**:
- Calibration has **independent state** per mode group: `dfCalibration` (Direct Feed) and `a4Calibration` (A4 Carrier), selected via `const currentCalibration = isDF ? dfCalibration : a4Calibration`.
- `clampCalibration(raw)`: rejects NaN/Infinity → 0, normalizes -0 → 0, clamps to ±25mm, rounds to 0.1mm.
- `validateCalibrationPair(x, y)`: runtime guard — finite + within ±25mm.
- `resolveCalibratedGeometry()`: for A4, clamps calibration at runtime so the cheque rectangle stays within the page. For Direct Feed, calibration only shifts field content within the cheque's coordinate space.
- Input parsing (`parseCalibrationInput`): rejects non-numeric input like "30mm" (regex `/^[-+]?\d*\.?\d*$/`), value stays unchanged.

**Decision**: Retain independent calibration per mode group with ±25mm range, 0.1mm steps, and strict numeric input parsing.

**Rationale**: Printer offsets differ between Direct Feed and A4 Carrier modes. Users should not need to adjust offset when switching modes.

**Alternatives considered**: Single shared calibration — rejected because users would need to readjust when switching between printing on cheque stock vs A4 carrier paper.

---

### RQ-6: How are bank templates structured and validated at load time?

**Findings**:
- `src/lib/templates.ts` defines `BANK_TEMPLATES` array: Siddhartha, Nabil, NIC Asia, Everest, Bank of Pokhara — each with field coordinates, structural positions, 4 print profiles, and print config.
- `assertAllTemplatesValid()` runs at **module load**: validates dimensions, all 4 profiles, print config (calibration defaults ±25mm, supported modes), enabled flag, field coordinates (within bounds), structural positions.
- Template field coordinates are bank-specific (e.g., Siddhartha date at x=128, Nabil at x=130).
- `getTemplate(id)` and `getAllTemplates()` are the runtime accessors.
- Templates are validated once — corrupt templates can never reach the print engine.

**Decision**: Retain static template array with load-time validation.

**Rationale**: Static templates are simple, testable, and cannot produce corrupt state at runtime. Bank-specific field coordinates match physical cheque layouts.

**Alternatives considered**: Dynamic template loading from a backend API — rejected as out of scope (no backend exists). Template builder UI — rejected as future enhancement.

---

### RQ-7: How does font fitting work for variable-length payee names?

**Findings**:
- `fitFontSize(text, field)` in Workspace.tsx: estimates text width as `charLength × (fontSize × 0.352778 × 0.55 + letterSpacing)` mm. Iterates from preferred font size down by 0.25pt increments until width fits within field width minus 0.8mm. Hard floor at 6pt (`MIN_PAYEE_FONT_SIZE`).
- `splitWordsToLines(words, template)`: greedy word-packing into two lines. Packs words into line 1 until `fitFontSize(candidate, words1)` would drop below `minFontSize`, then moves the rest to line 2.
- Font size is computed using px units on screen (scaled by SCALE=2.4) and pt units in print output (1:1 mm).
- `MIN_PAYEE_FONT_SIZE = 6` is exported as a constant for test verification.

**Decision**: Retain the iterative font-fitting approach with 6pt floor and greedy two-line word splitting.

**Rationale**: Prevents text overflow on physical cheques with long payee names. Minimum readable font size (6pt) enforced as a hard floor.

**Alternatives considered**: CSS `scale()` transform to fit text — rejected because print output must use fixed mm/pt dimensions; CSS scaling is unreliable across print engines.

---

### RQ-8: How does the print CSS work and what is the screen-vs-print DOM strategy?

**Findings**:
- `src/app/print.css`:
  - `.print-output-screen` is parked off-screen (`left: -10000px`) on screen so it never flashes.
  - During print: `.no-print` elements are `display: none`, print containers go to `position: static` (normal flow at page top).
  - `html, body` get `overflow: hidden`, `zoom: 1`, `transform: none` to prevent browser scaling.
  - All print children get `page-break-inside: avoid` to prevent multi-page output.
  - Debug guides are `display: none` during print.
- The print payload is a separate DOM tree (`PrintOutput` component) that renders at 1:1 mm scale — **not** the screen preview (which is scaled by SCALE=2.4 for readability).
- A `printKey` mechanism (via `data-print-key` attribute + `useKey` prop) ensures the print DOM syncs to current state.

**Decision**: Maintain the dual-DOM strategy: screen preview at 2.4x scale for readability, hidden print output at 1:1 mm scale.

**Rationale**: Screen preview needs to be readable on a typical monitor; print output must be exact physical dimensions. A single scaled DOM cannot satisfy both.

**Alternatives considered**: Single DOM with CSS `@media print` transform to 1:1 — rejected because browser zoom/scaling settings can interfere; the dual-DOM approach is deterministic.

---

## Decisions Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| JS-injected @page rule | Page size varies per bank+mode; static CSS cannot adapt | Static @page — rejected |
| No CSS rotation for Direct Feed | Renders horizontally readable; feed direction is printer setting | CSS transform rotate — rejected (unreadable preview) |
| Integer paisa storage | Eliminates floating-point errors | Float/string storage — rejected |
| Full Nepali numbering (Kharab→Hundred) | Handles amounts up to 999,999,999,999.99 NPR | Snippet's limited (Crore only) — insufficient |
| Sequential print gate | Actionable error per failure | Single combined validation — rejected |
| Independent calibration per mode | Printer offsets differ per mode | Shared calibration — rejected |
| Static templates + load-time validation | Simple, testable, no runtime corruption | Backend API — out of scope |
| Iterative font fitting (6pt floor) | Prevents overflow on long payee names | CSS scale() — unreliable in print |
| Dual-DOM (screen 2.4x / print 1:1) | Readable preview + exact print dimensions | Single DOM with media query — rejected |

---

## Research Output

All unknowns from the Technical Context have been resolved by reading the source code in `src/lib/`, `src/components/`, `src/app/`, and `tests/`. No [NEEDS CLARIFICATION] items remain.

**Sources consulted**:
- `package.json` — dependencies and scripts
- `src/lib/types.ts` — type definitions
- `src/lib/templates.ts` — 5 bank templates with field coordinates
- `src/lib/amountWords.ts` — amount parsing, number-to-words, validation
- `src/lib/printGeometry.ts` — geometry resolver (single source of truth)
- `lib/calibration.ts` — calibration clamping/validation
- `lib/validation.ts` — template/field/geometry validation
- `src/components/dashboard/Workspace.tsx` — main UI, preview, print orchestration
- `src/app/print.css` — print stylesheet
- `src/app/globals.css` — design system
- `tests/validation.test.mjs` — validation test patterns
