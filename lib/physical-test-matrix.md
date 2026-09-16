# Physical Test Matrix — Canon G2010

> **Purpose:** Record the expected vs. actual physical print alignment for
> every supported print mode. No claim of physical success is valid until
> the `actual X`, `actual Y` columns are filled by a real-sheet test.

> **How to test:** Print a single cheque on genuine 190.5 × 88.9 mm cheque
> stock (Direct Feed) or plain A4 (A4 Carrier), measure the ink edge of the
> printed field box relative to the paper edge with a ruler, and record
> the values below. Apply a correction, then re-print until the deviation
> is ≤ 0.5 mm.

---

## Cheque physical dimensions (constant)

| Dimension | Value |
|-----------|-------|
| Cheque width (W)  | 190.5 mm |
| Cheque height (H) | 88.9 mm |

## A4 carrier dimensions

| Orientation | Page W × Page H |
|-------------|-----------------|
| Portrait    | 210 × 297 mm   |
| Landscape   | 297 × 210 mm   |

---

## Test cases

### 1. Direct Feed — Short Edge First (custom_short)

**Geometry model:** Page box = 88.9 × 190.5 mm (cheque rotated 90°). CSS
`rotate(90deg)` with `transform-origin: 0 0` (top-left) and an offset of
(88.9mm, 0) fills the container exactly. Printer feeds along the 190.5 mm edge.

| Field                 | Expected X (mm) | Expected Y (mm) | Actual X (mm) | Actual Y (mm) | Correction (mm) | Final Calibration X | Final Calibration Y |
|-----------------------|-----------------|-----------------|---------------|---------------|-----------------|---------------------|---------------------|
| Page box top-left     | 0.0             | 0.0             |               |               |                 |                     |                     |
| Cheque content origin | 0.0             | 0.0             |               |               |                 |                     |                     |
| Date field            | 128.0           | 6.0             |               |               |                 |                     |                     |
| Payee field           | 12.0            | 28.0            |               |               |                 |                     |                     |
| Amount field          | 110.0           | 66.0            |               |               |                 |                     |                     |

### 2. Direct Feed — Long Edge First (custom_long)

**Geometry model:** Page box = 190.5 × 88.9 mm (cheque unrotated). No CSS
rotation applied. Printer feeds along the 88.9 mm edge.

| Field                 | Expected X (mm) | Expected Y (mm) | Actual X (mm) | Actual Y (mm) | Correction (mm) | Final Calibration X | Final Calibration Y |
|-----------------------|-----------------|-----------------|---------------|---------------|-----------------|---------------------|---------------------|
| Page box top-left     | 0.0             | 0.0             |               |               |                 |                     |                     |
| Cheque content origin | 0.0             | 0.0             |               |               |                 |                     |                     |
| Date field            | 128.0           | 6.0             |               |               |                 |                     |                     |
| Payee field           | 12.0            | 28.0            |               |               |                 |                     |                     |
| Amount field          | 110.0           | 66.0            |               |               |                 |                     |                     |

### 3. A4 Carrier — Portrait (a4_vertical)

**Geometry model:** Page box = 210 × 297 mm. Cheque (190.5 × 88.9) placed at
profile x=9.75, y=20. Calibration ±25 mm applied after profile position.

| Field                 | Expected X (mm) | Expected Y (mm) | Actual X (mm) | Actual Y (mm) | Correction (mm) | Final Calibration X | Final Calibration Y |
|-----------------------|-----------------|-----------------|---------------|---------------|-----------------|---------------------|---------------------|
| Page box top-left     | 0.0             | 0.0             |               |               |                 |                     |                     |
| Cheque origin (base)  | 9.75            | 20.0            |               |               |                 |                     |                     |
| Date field            | 137.75          | 26.0            |               |               |                 |                     |                     |
| Payee field           | 21.75           | 48.0            |               |               |                 |                     |                     |
| Amount field          | 119.75          | 86.0            |               |               |                 |                     |                     |
| A4 right margin       | 199.75          | —               |               |               |                 |                     |                     |
| A4 bottom margin      | —               | 108.9           |               |               |                 |                     |                     |
| **Calibrated safe range X** | min −9.75  | max +9.75        | —             | —             | —               |                     |                     |
| **Calibrated safe range Y** | min −20.0  | max +188.1       | —             | —             | —               |                     |                     |

### 4. A4 Carrier — Landscape (a4_horizontal)

**Geometry model:** Page box = 297 × 210 mm. Cheque (190.5 × 88.9) placed at
profile x=20, y=50.75. Calibration ±25 mm applied after profile position.

| Field                 | Expected X (mm) | Expected Y (mm) | Actual X (mm) | Actual Y (mm) | Correction (mm) | Final Calibration X | Final Calibration Y |
|-----------------------|-----------------|-----------------|---------------|---------------|-----------------|---------------------|---------------------|
| Page box top-left     | 0.0             | 0.0             |               |               |                 |                     |                     |
| Cheque origin (base)  | 20.0            | 50.75           |               |               |                 |                     |                     |
| Date field            | 150.0           | 56.75           |               |               |                 |                     |                     |
| Payee field           | 32.0            | 78.75           |               |               |                 |                     |                     |
| Amount field          | 132.0           | 116.75          |               |               |                 |                     |                     |
| A4 right margin       | 210.5           | —               |               |               |                 |                     |                     |
| A4 bottom margin      | —               | 139.65          |               |               |                 |                     |                     |
| **Calibrated safe range X** | min −20.0  | max +86.5        | —             | —             | —               |                     |                     |
| **Calibrated safe range Y** | min −50.75 | max +70.35       | —             | —             | —               |                     |                     |

---

## Calibration independence matrix

| Mode change                 | DF calibration | A4 calibration |
|-----------------------------|----------------|----------------|
| Direct Feed → A4 Carrier    | preserved      | preserved      |
| A4 Carrier → Direct Feed    | preserved      | preserved      |
| Any mode calibration edit   | only one set   | only one set   |

Each mode group has its own calibration state. Editing DF X offset does
**not** touch A4 calibration and vice versa.

---

## Validation gate summary

| Check                           | Enforced by           | Action on fail         |
|---------------------------------|-----------------------|------------------------|
| NaN / Infinity calibration      | `clampCalibration`    | → 0                    |
| Out-of-range calibration (>±25) | `validateCalibratedBounds` | Block print        |
| Cheque off-page at max cal (A4) | `validateCalibratedBounds` | Block print        |
| Template field overflow         | `validateBankTemplate`   | Block at load      |
| DF rotation bounding box        | `resolvePrintGeometry`   | Math-verified    |

---

## Instructions for physical testing

1. Load the app and select a bank template (e.g. Siddhartha).
2. Select the print mode to test.
3. Enter a valid date, payee, amount, and words.
4. Set calibration to X=0, Y=0 (known starting point).
5. Click **Print Cheque** → in the browser print dialog:
   - Select **Canon G2010** as the printer.
   - Set **Paper source** to the appropriate tray (cheque feeder for Direct Feed,
     rear tray or main tray for A4).
   - Set **Scaling** to **Actual Size (100%)** — do NOT use "Fit to Page".
   - Set **Margins** to minimum/none.
   - Click **Print**.
6. Measure the printed field positions with a ruler against the paper edges.
7. Fill in `Actual X`, `Actual Y` in the table above.
8. Compute `Correction = Expected − Actual` and enter as the new calibration.
9. Re-print and verify the deviation is ≤ 0.5 mm.
10. Record the `Final Calibration` values and update the printer-specific
    default calibration in the store/config.

> **Note:** Different paper sources on the G2010 (e.g. "Rear Tray" vs
> "Manual Feed") may have different physical offsets. If so, maintain a
> per-source calibration record. The ±25 mm range accommodates these offsets.

---

## Mathematical verification (software-side, pre-print)

The following calculations have been verified against the geometry pipeline
(`lib/printGeometry.ts`) and are the expected (zero-calibration) positions
for a template with bank-default field coordinates (e.g. Siddhartha Bank):

### Direct Feed — Short Edge First (custom_short)

- **Page box:** 88.9 mm (W) × 190.5 mm (H)
- **Cheque raw size:** 190.5 mm (W) × 88.9 mm (H)
- **CSS rotation:** `rotate(90deg)`, `transform-origin: 0 0`
- **Rotation matrix:** (x, y) → (-y, x) — clockwise 90° in Y-down coords
- **Corner mapping** (cheque-local → page-box-local):
  - (0, 0) → (0, 0)
  - (190.5, 0) → (0, 190.5)
  - (190.5, 88.9) → (-88.9, 190.5)
  - (0, 88.9) → (-88.9, 0)
- **Rotated bounding box:** X ∈ [-88.9, 0], Y ∈ [0, 190.5]
- **Page box bounds:** X ∈ [0, 88.9], Y ∈ [0, 190.5]
- **Required offset to fill page box:** (left=88.9mm, top=0mm)
- **Verification:** `rotatedContentOffset()` returns `{ leftMm: 88.9, topMm: 0 }` ✓

### Direct Feed — Long Edge First (custom_long)

- **Page box:** 190.5 mm (W) × 88.9 mm (H)
- **No rotation** — cheque fills page box directly
- **Offset:** (0, 0) ✓

### A4 Carrier — Portrait (a4_vertical)

- **Page box:** 210 mm × 297 mm
- **Cheque base position:** x=9.75, y=20 (from template profile)
- **Cheque right edge:** 9.75 + 190.5 = 200.25 mm ≤ 210 ✓
- **Cheque bottom edge:** 20 + 88.9 = 108.9 mm ≤ 297 ✓
- **Horizontal margin (right):** 210 - 200.25 = 9.75 mm
- **Vertical margin (bottom):** 297 - 108.9 = 177.1 mm
- **Calibration safe range X:** [-9.75, +9.75] mm (clamped by `clampCalibrationValue`)
- **Calibration safe range Y:** [-20.0, +188.1] mm (clamped by `clampCalibrationValue`)
- **Note:** The ±25 mm input clamp is further clamped at runtime by `resolveCalibratedGeometry` to keep the cheque on-page.

### A4 Carrier — Landscape (a4_horizontal)

- **Page box:** 297 mm × 210 mm
- **Cheque base position:** x=20, y=50.75 (from template profile)
- **Cheque right edge:** 20 + 190.5 = 210.5 mm ≤ 297 ✓
- **Cheque bottom edge:** 50.75 + 88.9 = 139.65 mm ≤ 210 ✓
- **Horizontal margin (right):** 297 - 210.5 = 86.5 mm
- **Vertical margin (bottom):** 210 - 139.65 = 59.35 mm
- **Calibration safe range X:** [-20.0, +86.5] mm (clamped by `clampCalibrationValue`)
- **Calibration safe range Y:** [-50.75, +70.35] mm (clamped by `clampCalibrationValue`)

---

## Physical printer validation status

**Physical printer validation is pending.** No actual printer (Canon G2010 or otherwise) has been tested with this software build. The mathematical verification above confirms that the geometry pipeline produces correct page dimensions, rotation offsets, and bounding-box containment at zero calibration. Real-sheet testing with the Canon G2010 is required to fill in the "Actual X / Actual Y" columns and determine final per-mode calibration values.
