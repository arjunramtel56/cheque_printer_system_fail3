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

export const FIELD_POSITIONS = {
  date: { x: 148, y: 12, w: 38, align: "left" as const },
  payeeName: { x: 14, y: 32, w: 150, align: "left" as const },
  amountWords: { x: 14, y: 50, w: 150, align: "left" as const },
  amountFig: { x: 148, y: 32, w: 38, align: "right" as const },
  chequeNumber: { x: 4, y: 4, w: 40, align: "left" as const },
} as const;

export const MM_TO_PX = 96 / 25.4;
