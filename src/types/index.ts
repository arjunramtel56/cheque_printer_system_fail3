export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER" | "TRIAL_USER";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "PENDING_VERIFICATION";
}

export interface ChequeFieldConfig {
  field: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  rotation?: number;
  color?: string;
  format?: string;
}

export interface ChequeTemplate {
  id: string;
  name: string;
  bankId: string;
  bankName: string;
  chequeWidth: number;
  chequeHeight: number;
  fields: ChequeFieldConfig[];
}

export type Locale = "en" | "ne";
