# Reactify Cheque Printer System

A bank-template-driven cheque printing system for Nepal, built with **Next.js 16
(App Router) + React 18 + TypeScript**. Every physical dimension in the
application is millimetre-based and data-driven: adding a bank or a new cheque
format is a data change, not a code change.

* **Developed by:** Reactify Software Technologies Pvt. Ltd.
* **Support:** [support@reactifysoftwaretechnologies.com.np](mailto:support@reactifysoftwaretechnologies.com.np)
* **Phone:** 9743836026
* **Address:** Kankai Municipality-3, Nepal
* **PAN:** 65284125
* **Website:** [https://www.reactifysoftwaretechnologies.com.np](https://www.reactifysoftwaretechnologies.com.np)

---

## Read this first: what is real and what is not

This repository contains the **Phase 1 cheque printing engine**. It is honest
about its own state, and the quickest way to break it is to assume more than
that:

| Claim | Reality |
|-------|---------|
| Bank catalogue | **76 institutions seeded** (29 Class A, 16 Class B, 17 Class C, 14 Class D). Class A is complete, including merged institutions; B/C/D are subsets to be extended through admin import. |
| Cheque templates | **5 exist** — Siddhartha plus four clone-geometry placeholders (Nabil, NIC Asia, Everest, Bank of Pokhara). Only `siddhartha` is `browser-verified`. |
| Geometry provenance | Real coordinates exist for Siddhartha only. The other four deliberately reuse the same field coordinates; they are badged **“Layout unverified”, warn at print time, and must not be used on real cheque stock** until real values are entered from a sample cheque. They stay selectable on purpose — a plain-paper test print is how a template gets verified. |
| Physical print verification | **None.** No cheque has been printed and measured by this build. Browser verification does not imply ink position — see [Verification](#verification). |
| Cheque sizes registered | One: `standard-190x89` (190.5 × 88.9 mm, landscape). The size registry supports arbitrary mm sizes and per-template orientation; only one size has real data behind it. |
| Admin authentication | A **client-side demo gate**: password `admin`, a non-cryptographic hash, and a session in `localStorage`. There is no server, no API routes and no database in this repository. Do not deploy the admin panel as-is. |
| Payment / VAT / invoicing / MFA / email verification | **Not present in this repository.** These are documented for the wider product in [docs/legacy-product-readme-v1.md](docs/legacy-product-readme-v1.md), which describes a different, larger codebase and is kept for reference only. |

If you are looking for the commercial platform documentation (subscriptions,
invoices, Railway deployment, MFA), it is in that legacy file — but no code in
this repository implements it.

---

## Architecture

```
Bank (data/banks.ts)                      identity only: name, NRB class, status
  |
  +-- ChequeTemplate (data/templates.ts)  geometry: size ref, orientation, fields,
     |                                    print modes, safe zones, verification
     |
     +-- ChequeSize (lib/sizes.ts)       190.5 x 88.9 mm ... arbitrary, millimetres
     |
     +-- PaperSize (lib/sizes.ts)         A4 portrait / landscape, carrier only
     |
     +-- Field rectangles                 x, y, width, height in mm
     |
     +-- Safe zones                       reserved bands (MICR) — never printed
     |
     +-- Calibration (per template, per mode)   X/Y offset in 0.1 mm steps, +/-25 mm
```

The pipeline every print goes through:

```
user input -> selected bank -> selected template -> mm geometry -> field
rectangles -> orientation -> calibration -> computeSheetLayout()
   |                                                       |
   +--> ChequeSheet (screen preview)  <-- same component --> ChequeSheet (print)
```

`lib/sheetLayout.ts` produces the single set of millimetre rectangles that both
the preview and the printed page render; the only difference between the two is
a constant scale factor. Preview/print parity is therefore **structural**, not a
promise, and it is asserted by `tests/preview-print-parity.test.mjs`.

### Files worth knowing

| Path | Role |
|------|------|
| `lib/types.ts` | Domain types: `Bank`, `BankTemplate`, `ChequeSize`, `PaperSize`, `SafeZone`, `ProfileKey`, `Orientation`, `Calibration` |
| `lib/sizes.ts` | The **only** place physical millimetre constants are declared; includes the runtime size registry |
| `data/banks.ts` | Seeded NRB institution catalogue with provenance and status |
| `data/templates.ts` | Cheque templates: seeds + clone helper, each with verification metadata |
| `lib/catalogue.ts` | Selectors: selectable vs pending banks, bank groups, summary counts, admin import/export |
| `lib/printGeometry.ts` | `resolveCalibratedGeometry` — page box, cheque box, rotation, clamping |
| `lib/sheetLayout.ts` | `computeSheetLayout` — the single mm layout pipeline |
| `lib/textFit.ts` | Font fitting and amount-in-words line splitting |
| `lib/amountWords.ts` | Amount parsing (integer paisa), words generation, Nepali date digits |
| `lib/calibration.ts` | Per (template × mode) calibration store, clamping, bounds validation |
| `lib/validation.ts` | Field, template, size and calibration validation gates |
| `components/ChequeSheet.tsx` | The one renderer used by preview **and** print |
| `components/Workspace.tsx` | The guided print workspace: selection, entry, modes, calibration, print |
| `components/admin/*` | Template editor and workbench used by the admin pages |
| `lib/physical-test-matrix.md` | Per-template physical verification protocol and record sheets |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Guided entry: choose a bank, then a cheque template |
| `/banks` | Full bank catalogue with provenance and template availability |
| `/banks/[bank]` | Templates for one bank, with their verification status |
| `/banks/[bank]/cheque/[template]` | The print workspace (deep-linkable, URL-bound selection) |
| `/admin/login` | Demo admin gate (password `admin`) |
| `/admin` | Admin overview and counters |
| `/admin/banks` | Bank CRUD, enable/disable, verification marking |
| `/admin/templates` | Template list, create, duplicate |
| `/admin/templates/[id]` | Template workbench: geometry, orientation, size, safe zones, test print |
| `/admin/calibration` | Calibration records per template and print mode |

### Print modes

| Key | Label | Page box |
|-----|-------|----------|
| `custom_short` | Direct Feed · Short Edge First | cheque stock, unrotated |
| `custom_long` | Direct Feed · Long Edge First | cheque stock, unrotated |
| `a4_vertical` | A4 Carrier · Portrait | 210 × 297 mm |
| `a4_horizontal` | A4 Carrier · Landscape | 297 × 210 mm |

Direct feed prints on cheque-sized stock, so calibration shifts the **content**
inside a page that is exactly the cheque size. Carrier modes print on A4, so
calibration shifts the **cheque block** inside the sheet. In both cases X moves
horizontally only, Y vertically only, and the cheque's physical size never
changes.

---

## Adding a bank or a cheque format

1. **Bank** — add an entry to `data/banks.ts` with its NRB class and status.
2. **Cheque size** — measure the real cheque (mm) and register it in
   `lib/sizes.ts`. Never reuse a size because it is "close enough".
3. **Template** — add the field rectangles, orientation and print modes to
   `data/templates.ts`. Keep everything in millimetres.
4. **Safe zones** — declare the MICR band as reserved. A field overlapping a
   reserved band fails validation and the template is blocked at load, rather
   than printing a ruined cheque.
5. **Verify** — set `verification.status` to `browser-verified` once the
   geometry is checked against a sample cheque, then run the record sheet in
   `lib/physical-test-matrix.md` before marking anything `physically-verified`.

Nothing in steps 1–4 requires touching a component. That is the whole point of
the architecture — and the regression tests enforce it.

---

## Verification

Two verification levels are tracked separately and must never be conflated:

* **`browser-verified`** — page box, cheque box, field rectangles, orientation,
  calibration arithmetic and preview/print parity confirmed in the browser.
  Provable by the test suite.
* **`physically-verified`** — ink lands within ±0.5 mm of the expected position
  on real cheque stock, measured with a ruler. Only a human with a printer can
  establish this, and this build has not done it for any template.

`getCatalogueSummary().physicallyCalibratedCount` is the live count: currently
**0**. Per-template expected coordinates, record sheets and the MICR check are
in [lib/physical-test-matrix.md](lib/physical-test-matrix.md).

---

## Tests

```bash
npm run typecheck   # tsc --noEmit
npm test            # full suite
```

| Suite | Covers |
|-------|--------|
| `tests/workspace.test.mjs` | Workspace rendering and workflow contracts |
| `tests/print-flow.test.mjs` | End-to-end print flow behaviour |
| `tests/validation.test.mjs` | Validation gates (fields, sizes, calibration, dates, amounts) |
| `tests/print-verification.mjs` | Print geometry across all templates and modes |
| `tests/catalogue.test.mjs` | Bank/template catalogue integrity and selectors |
| `tests/geometry-matrix.test.mjs` | Every template × mode: page box, cheque box, calibration invariance |
| `tests/preview-print-parity.test.mjs` | Preview and print render identical mm rectangles |
| `tests/part4-print-workflow.test.mjs` | Print workflow states, gating, readiness |
| `tests/part5-qa.test.mjs` | Quality gates and edge cases |

Tests run against TypeScript sources via `tsx`; there is no build step for the
suite.

---

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm start
```

No environment variables are required — the application reads none.

Two traps specific to this project:

* **Pin the port.** If your shell has `PORT` set (for example `PORT=0`), Next.js
  will pick a random port and your bookmarks break. Set `PORT=3000` explicitly.
* **Use `localhost`, not `127.0.0.1`.** Next.js 16 dev blocks cross-origin dev
  resources for unlisted origins: loading the app from `127.0.0.1` serves
  correct markup but silently skips hydration, leaving every control disabled.
  If you need that origin, add `allowedDevOrigins: ['127.0.0.1']` to
  `next.config.mjs`.

---

## Known limitations

* Admin auth is a client-side demo gate over `localStorage`; all admin state
  (banks, templates, sizes, calibration) lives in the browser. There is no
  server-side authorization, persistence or audit trail in this repository.
* 71 of the 76 catalogued banks have no geometry at all and are listed as "template pending", not selectable.
* Unverified templates are not blocked from printing (the verification workflow needs a test print) — they are badged, annotated with their provenance, and warned about in the readiness panel.
* Only one cheque size is registered; portrait cheque templates are supported by
  the model but no portrait template exists yet.
* Text that exceeds a field is shrunk to a readable floor of 6 pt and clipped
  beyond that, rather than becoming unreadable micro-print.
* Signature panels are screen-only overlays marking the pre-printed cheque
  stock; they are never printed.
