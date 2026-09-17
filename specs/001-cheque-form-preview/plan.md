# Implementation Plan: Cheque Form & Print Preview

**Branch**: `001-cheque-form-preview` | **Date**: 2026-09-17 | **Spec**: [specs/001-cheque-form-preview/spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cheque-form-preview/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Build a React/Next.js web application that lets users enter Nepalese bank cheque details (bank template, date, payee, amount, amount-in-words) and produces a live, accurate print preview aligned to physical cheque dimensions (190.5 × 88.9 mm). The print pipeline must render fields at 1:1 mm scale using CSS absolute positioning, inject a matching `@page` rule, and block printing on invalid/inconsistent data. Calibration offsets (±25 mm, 0.1 mm steps) let users compensate for printer-specific alignment drift.

## Technical Context

**Language/Version**: TypeScript 5.8, React 18.3, Next.js 16.3, Node.js (via tsx for tests)

**Primary Dependencies**: React 18, React DOM, Next.js 16. No external UI library — styling is via Tailwind CSS utility classes on screen and plain CSS `@page` + absolute mm positioning for print output.

**Storage**: None (client-side only). Calibration state is held in React component state per print-mode group (Direct Feed vs A4 Carrier). No backend or database required.

**Testing**: tsx (TypeScript execution environment) running `.mjs` test files with assert-style patterns. `npm test` executes `tests/workspace.test.mjs`, `tests/print-flow.test.mjs`, `tests/validation.test.mjs`, and `tests/print-verification.mjs`. Tests import pure functions from `lib/` and exercise the sequential print gate logic.

**Target Platform**: Modern browsers (Chrome/Chromium print API) for both screen preview and `window.print()` output. Cheque stock: 190.5 × 88.9 mm (8.5" × 3.5").

**Project Type**: web-application (frontend, client-side rendered React)

**Performance Goals**: Screen preview updates in real-time (no perceptible delay on keystroke). Print alignment within ±1 mm of target after ≤2 calibration adjustments.

**Constraints**:
- Print output MUST be at 100% actual size — browser "fit to page" must be disabled.
- All field coordinates use mm-based CSS positioning (1:1 mm scale for print).
- Money MUST be stored and computed as integer paisa (1 NPR = 100 paisa) — no floating-point arithmetic for amounts.
- Calibration range is ±25 mm with 0.1 mm steps.
- @page size is injected via JavaScript at print time (not static CSS) so it matches the resolved geometry.
- No third-party dependencies beyond React/Next.js.

**Scale/Scope**: Single-page application, 5 built-in bank templates (expandable), ~3000 LOC across `components/` + `lib/`, ~1100 LOC of tests. Supports Direct Feed (blank cheque stock) and A4 Carrier (cheque on A4 sheet) print modes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is a template with placeholder content — no project-specific principles or gates have been ratified. All checks pass with no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-cheque-form-preview/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── print-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
components/
├── Workspace.tsx        # Main UI container: form, live preview, print orchestration, calibration, state machine

app/
├── layout.tsx           # Root layout — imports globals.css + print.css
├── globals.css          # Design system: colors, typography, component styles, responsive
├── print.css            # Print stylesheet: @page rules, screen-vs-print visibility, mm positioning
└── page.tsx             # Entry point — renders <Workspace />

lib/
├── types.ts             # BankTemplate, ProfileKey, Calibration, PrintProfile, ChequeFieldCoords
├── templates.ts         # Built-in bank templates (Siddhartha, Nabil, NIC, Everest, BoP) + getters
├── amountWords.ts       # Strict amount parser, integer-paisa math, number-to-words (Nepali), date + payee validation
├── printGeometry.ts     # Geometry resolver — SINGLE source of truth for @page size, container, cheque position
├── calibration.ts       # X/Y offset clamping (±25mm, 0.1mm steps) + pair validation
└── validation.ts        # Template/field/geometry validation (load-time + print-time gates)

tests/
├── validation.test.mjs           # Amount/date/payee/geometry validation (28+ test groups)
├── workspace.test.mjs            # Component behavior + state machine tests
├── print-flow.test.mjs           # Print sequence and gate tests
├── print-verification.mjs        # Print output structure verification
├── part4-print-workflow.test.mjs # Workflow state transitions
└── part5-qa.test.mjs             # QA / integration tests
```

**Structure Decision**: Single Next.js web application (frontend-only, no backend). Components are split into `components/` (UI) and `lib/` (pure logic, testable without React). Tests live in `tests/` as `.mjs` files run via `tsx`. This follows the existing "Single project" structure — no monorepo needed since there is no backend API.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The project is a single Next.js web app with no backend, no database, and no external services. The existing architecture is sufficient for the requested feature scope.

---

## Phase 0: Research

### Research Questions

1. **How does the existing print pipeline ensure @page size matches the rendered container?**
   - `lib/printGeometry.ts` → `resolvePrintGeometry()` is the single source of truth. It computes `pageW/pageH` for the `@page` rule and `containerW/containerH` for the print container — both derived from the same values. The Workspace `handlePrint()` injects an inline `<style>` with `@page { size: geom.pageW mm geom.pageH mm; ... }` and sets the container class to `print-direct-feed` or `print-a4-carrier` with matching mm dimensions. The screen `globals.css` does NOT define a static `@page` size — it uses `size: auto` as a fallback that is overridden at print time.

2. **How are Direct Feed and A4 Carrier modes differentiated?**
   - `isDirectFeed(mode)` checks if mode is `custom_short` or `custom_long`. For Direct Feed, `@page` = cheque physical size (190.5 × 88.9 mm, landscape), content rendered unrotated (no CSS `transform: rotate`). Short Edge First vs Long Edge First is a printer driver setting, not a CSS transform. For A4 Carrier, `@page` = A4 (210×297 portrait or 297×210 landscape), cheque inset at `profile.x/y` + calibration.

3. **How does number-to-words conversion work for Nepali amounts?**
   - `lib/amountWords.ts` uses `integerToWords()` which handles the Nepali numbering hierarchy: Kharab (10^12), Arab (10^9), Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2). Money is stored as integer paisa (e.g., 100.50 NPR → 10050 paisa) to avoid floating-point errors. The `amountToWordsFromPaisa()` function splits into rupees/paisa and produces "X Rupees and Y Paisa Only".

4. **How does the print-readiness gate work?**
   - `Workspace.tsx` `handlePrint()` applies a sequential validation: date → payee → amount → amount > 0 → words non-empty → words consistency (`checkAmountWordsConsistency`) → template selected → print mode → calibration pair validity → profile exists → geometry valid (`validatePrintGeometry`) → calibrated bounds valid (`validateCalibratedBounds`). Each step short-circuits with a user-facing error if it fails.

5. **How does calibration work and how is it scoped per mode?**
   - Calibration has independent state for Direct Feed (`dfCalibration`) and A4 Carrier (`a4Calibration`), selected via `isDF ? dfCalibration : a4Calibration`. Values are clamped to ±25 mm via `clampCalibration()` (rejects NaN/Infinity, normalizes -0→0, rounds to 0.1mm). `resolveCalibratedGeometry()` further clamps A4 calibration at runtime so the cheque never leaves the page.

6. **How are bank templates structured and validated?**
   - `lib/templates.ts` defines `BANK_TEMPLATES` array with `BankTemplate` objects (id, bankName, widthMm, heightMm, fields, structural, profiles, print config, enabled). `validateBankTemplate()` runs at module load to validate dimensions, profile configs, field coordinates, and calibration defaults. Templates are loaded from this static array; admin overrides can be merged at runtime via localStorage.

7. **How does font fitting work for variable-length payee names?**
   - `fitFontSize()` in Workspace.tsx estimates text width as `charLength × (fontSize × 0.352778 × 0.55 + letterSpacing)` and iteratively reduces font size by 0.25pt until it fits within the field width, with a hard floor of 6pt (`MIN_PAYEE_FONT_SIZE`). Amount-words text is split into two lines via `splitWordsToLines()` which greedily packs words into the first line until font size would drop below the minimum.

### Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Integer paisa storage | Eliminates floating-point rounding errors in money math | Storing as float/string — rejected due to risk of accumulated errors in words conversion |
| mm-based CSS positioning for print | Physical cheque dimensions are in mm; browser CSS supports mm units natively | px/in units — require conversion and are DPI-dependent |
| No CSS rotation for Direct Feed | Short/Long Edge First is a printer feed setting, not a page orientation; renders horizontally readable | CSS `transform: rotate(90deg)` — causes Chrome print preview to show rotated content |
| JS-injected @page rule | Allows dynamic sizing based on selected bank + print mode; static CSS cannot vary by template | Static @page in globals.css — cannot adapt to different bank/template combinations |
| Sequential print gate (not single validation) | Each guard returns early with a specific error message, giving the user actionable feedback | Single combined validation — harder to surface the root cause |
| Independent calibration per mode group | Printer offsets differ between Direct Feed and A4 Carrier modes | Single shared calibration — would require user to readjust when switching modes |
| Inline style injection for print output | Print output uses `<div>` with absolute mm positioning, not an iframe or SVG — simpler DOM, CSS-controlled | iframe print / SVG print — adds complexity without benefit for this use case |

### Research Output Summary

All unknowns from the Technical Context have been resolved by reading the source code:
- TypeScript 5.8 + React 18.3 + Next.js 16.3 confirmed via `package.json`
- No external UI library confirmed — all styling is custom CSS
- Testing is `tsx`-based `.mjs` files confirmed via `package.json` scripts and `tests/` directory
- Browser-only client-side app confirmed — no backend routes in `app/`
- mm-based positioning confirmed in `print.css` and `Workspace.tsx` PrintOutput
- @page injection confirmed in `Workspace.tsx` handlePrint() inline `<style>`
- Integer paisa model confirmed in `lib/amountWords.ts`

## Phase 1: Design & Contracts

### Data Model

#### BankTemplate

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique template identifier (e.g., `"siddhartha"`) |
| `bankName` | string | Display name (e.g., `"Siddhartha Bank Limited"`) |
| `widthMm` | number | Physical cheque width in mm (190.5) |
| `heightMm` | number | Physical cheque height in mm (88.9) |
| `fields` | Record<string, ChequeFieldCoords> | Field positions: `date`, `payee`, `words1`, `words2`, `amount`, `accountPayee`, `memo` |
| `structural` | Record<string, StructuralPosition> | Positions for `payLabel`, `orBearer`, `sig1`, `sig2` |
| `profiles` | Record<ProfileKey, PrintProfile> | Print profiles for 4 modes (custom_short, custom_long, a4_vertical, a4_horizontal) |
| `print` | PrintConfig | Calibration defaults and supported modes |
| `enabled` | boolean | Whether the template is available for use |

**Field coords (`ChequeFieldCoords`)**: x (mm), y (mm), width (mm), fontSize (pt), minFontSize (pt), letterSpacing (mm), align ("left"\|"center"\|"right"), render ("text"\|"date-grid").

**Print profile (`PrintProfile`)**: x (mm on A4 page), y (mm on A4 page), pageWidth (mm), pageHeight (mm).

#### ChequeData (form state)

| Field | Type | Description |
|-------|------|-------------|
| `bankId` | string | Selected template ID |
| `payeeName` | string | Payee name (trimmed, max 120 chars) |
| `date` | string | ISO date string (YYYY-MM-DD) |
| `amount` | string | Raw amount string (e.g., "1000.50") — parsed to integer paisa |
| `amountWords` | string | Amount in words (auto-generated or user-edited) |
| `accountPayee` | boolean | A/C Payee crossing toggle |

#### Calibration

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X offset in mm, clamped [-25, 25] |
| `y` | number | Y offset in mm, clamped [-25, 25] |

#### PrintMode (ProfileKey)

- `custom_short` — Direct Feed, Short Edge First (cheque = page)
- `custom_long` — Direct Feed, Long Edge First (cheque = page)
- `a4_vertical` — A4 Carrier, Portrait (210 × 297 mm page)
- `a4_horizontal` — A4 Carrier, Landscape (297 × 210 mm page)

### State Transitions

```
empty → template-selected → data-entering → ready-print → printing → done
  ↑           ↓                ↗             ↑            ↗         ↓
  └─── handleClear ───────────┴─────────────┴─────┬─────┴─────────┘
                                                 ↓
                                              (re-select bank)
```

### Key Algorithms

1. **Amount parsing** (`parseNumericAmount`): Strict regex `/^(\d+)(\.(\d{1,2}))?$/` after comma stripping. Rejects negative, scientific notation, non-numeric, wrong decimal precision. Returns integer paisa.

2. **Number to words** (`integerToWords`): Iterative grouping by [Kharab, Arab, Crore, Lakh, Thousand, Hundred]. Each group uses `belowHundred()` for values < 100. Produces "X Rupees and Y Paisa Only".

3. **Font fitting** (`fitFontSize`): Estimates width = `len × (size × 0.352778 × 0.55 + spacing)`. Decrements size by 0.25pt until width fits, floor at 6pt (or `minFontSize`).

4. **Words-to-lines split** (`splitWordsToLines`): Greedy — packs words into line 1 until `fitFontSize(candidate, words1) < minFontSize`, then moves remaining to line 2.

5. **Print geometry** (`resolvePrintGeometry`): DF → page = cheque size (190.5 × 88.9). A4 → page = A4 dims, cheque at profile.x/y. No CSS rotation.

6. **Print gate** (`handlePrint`): Sequential validation with early return on each failure, surfacing specific error messages.

### Contracts

#### Print Contract

The print pipeline contract:

1. **Input validation** (all must pass before printing):
   - Date: valid YYYY-MM-DD, not in the future
   - Payee: non-empty, ≤120 chars, no emoji
   - Amount: valid numeric, > 0, ≤ MAX_AMOUNT_PAISA
   - Amount words: non-empty, consistent with numeric amount
   - Template: selected and enabled
   - Print mode: supported by template
   - Calibration: finite, within ±25 mm

2. **Print layout**:
   - @page size injected at print time: `size: {pageW}mm {pageH}mm` (landscape for DF)
   - Print container: 1:1 mm scale, absolute positioning, `font-family: "Courier New", monospace`
   - Screen UI: hidden via `.no-print { display: none }`

3. **Output**: Browser print dialog opens with cheque at actual size. `afterprint` event resets state.

### Quickstart Validation Guide

**Prerequisites**: Node.js 20+, npm 10+

**Setup**:
```bash
git clone <repo>
cd "Reactify Cheque Printer System"
npm install
npm run dev     # starts Next.js dev server at http://localhost:3000
```

**Run tests**:
```bash
npm test        # runs all validation, workflow, and print verification tests
```

**Validation scenarios**:
1. Launch app → select Siddhartha Bank → enter date (auto-filled), payee "Ram Bahadur Thapa", amount "1000.50" → words auto-generate "One Thousand Rupees and Fifty Paisa Only" → verify live preview matches → click Print → confirm @page = 190.5×88.9mm landscape.
2. Leave payee empty → click Print → verify "Payee name is required." error shown, print blocked.
3. Enter amount "1000" but type "Five Hundred Rupees Only" in words → click Print → verify mismatch error.
4. Switch from Direct Feed to A4 Carrier → verify calibration values are independent (DF X:0 Y:0, A4 X:0 Y:0 independently).
5. Enter "30mm" in X calibration → verify input rejected, value unchanged.

**Expected outcomes**:
- All tests pass (`npm test`).
- Live preview updates within 16ms of keystroke.
- Print @page dimensions match cheque physical size exactly.
- No floating-point rounding errors in amount conversions (100.50 → 10050 paisa → "One Hundred Rupees and Fifty Paisa Only").
