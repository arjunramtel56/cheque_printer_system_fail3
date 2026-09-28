export const CHEQUE = {
  WIDTH_MM: 190.5,
  HEIGHT_MM: 88.9,
} as const;

export const A4 = {
  PORTRAIT: { w: 210, h: 297 },
  LANDSCAPE: { w: 297, h: 210 },
} as const;

export const DEFAULT_PLACEMENT = {
  PORTRAIT: { x: 9.75, y: 10 },
  LANDSCAPE: { x: 10, y: 60 },
} as const;

/**
 * Field geometry measured against a real Siddhartha Bank commercial cheque
 * (190.5 x 88.9 mm). All values are millimetres from the cheque's top-left
 * corner.
 *
 *  - dateDigits: 8 individual date boxes (DDMMYYYY) at the top right.
 *  - payeeName:  beneficiary line, left side with a tab-style indent.
 *  - amountWords: line directly below the beneficiary line.
 *  - amountFig:  amount box on the right of the beneficiary line; the
 *                numeric amount is printed right-aligned inside the box.
 *  - crossing:   A/C PAYEE ONLY band, horizontally centred on the date line.
 */
export const FIELD_POSITIONS = {
  date: { x: 134.5, y: 8.5, w: 49, h: 8.4, boxes: 8, align: "left" as const },
  payeeName: { x: 16, y: 22.5, w: 114, align: "left" as const },
  amountWords: { x: 16, y: 30.5, w: 114, align: "left" as const },
  amountFig: { x: 134, y: 30.5, w: 49, h: 8.4, align: "right" as const },
  chequeNumber: { x: 4, y: 4, w: 40, align: "left" as const },
} as const;

/** Vertical centre (mm) of the date-box line — the A/C PAYEE ONLY band sits here. */
export const CROSSING_CENTER_Y_MM = FIELD_POSITIONS.date.y + FIELD_POSITIONS.date.h / 2;

export const MM_TO_PX = 96 / 25.4;
