export type ProfileKey = "custom_short" | "custom_long" | "a4_vertical" | "a4_horizontal";

export interface Calibration {
  x: number;
  y: number;
}

export interface ChequeFieldCoords {
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  minFontSize?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  render?: "text" | "date-grid";
}

export interface StructuralPosition {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface PrintProfile {
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  /** Legacy feed-direction field. Direct Feed profiles historically
   *  declared rotate=90 for Short-Edge-First (content rotated 90° CW to
   *  fill the swapped page box). This rotation model is deprecated: the
   *  system now renders content unrotated in a landscape 190.5×88.9 mm
   *  @page box, with feed direction handled by the printer driver.
   *  The field is retained for metadata compatibility and is always
   *  expected to be 0 for all modes. */
  rotate: number;
}

export interface BankTemplate {
  id: string;
  bankName: string;
  widthMm: number;
  heightMm: number;
  fields: Record<string, ChequeFieldCoords>;
  structural?: Record<string, StructuralPosition>;
  profiles: Record<ProfileKey, PrintProfile>;
}

export const DIRECT_FEED_MODES: ProfileKey[] = ["custom_short", "custom_long"];
export const A4_CARRIER_MODES: ProfileKey[] = ["a4_vertical", "a4_horizontal"];

export function isDirectFeed(mode: ProfileKey): boolean {
  return DIRECT_FEED_MODES.includes(mode);
}

export function isA4Carrier(mode: ProfileKey): boolean {
  return A4_CARRIER_MODES.includes(mode);
}
