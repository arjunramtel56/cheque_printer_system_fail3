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
`rotate(90deg)` with default centre `transform-origin` fills the container
exactly. Printer feeds along the 190.5 mm edge.

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
| **Calibrated safe range** | min −15.25 | min −20.0       | —             | —             | —               |                     |                     |

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
| **Calibrated safe range** | min −5.0  | min −25.0       | —             | —             | —               |                     |                     |

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
