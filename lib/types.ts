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
