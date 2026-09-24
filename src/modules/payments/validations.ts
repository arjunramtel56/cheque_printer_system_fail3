import { z } from "zod";

export const PaymentStatus = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const VALID_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING_VERIFICATION,
  PaymentStatus.APPROVED,
  PaymentStatus.REJECTED,
];

export const VALID_PAYMENT_METHODS = ["FONEPAY", "BANK_TRANSFER", "CASH", "OTHER"] as const;
export type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export const createPaymentSchema = z.object({
  plan: z.string().min(1, "Plan is required"),
  duration: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1")
    .max(12, "Duration must be at most 12")
    .optional(),
  amount: z.coerce.number().positive("Amount must be positive").optional(),
  currency: z.string().optional(),
  paymentMethod: z
    .enum(["FONEPAY", "BANK_TRANSFER", "CASH", "OTHER"])
    .optional()
    .default("FONEPAY"),
  reference: z
    .string()
    .trim()
    .min(1, "Transaction reference is required")
    .max(200, "Transaction reference too long"),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export const adminUpdatePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID is required"),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().trim().min(1, "Rejection reason is required").optional(),
});

export function validatePaymentAmount(
  amount: number,
  planPrice: number,
  duration: number
): boolean {
  const expected = Math.round(Number(planPrice) * (duration <= 1 ? 1 : duration));
  return Math.round(amount) === expected;
}

export function isOwnPayment(paymentUserId: string, adminUserId: string): boolean {
  return paymentUserId === adminUserId;
}

export function canTransition(oldStatus: string, newStatus: string): boolean {
  if (oldStatus === newStatus) return false;
  if (oldStatus === "PENDING_VERIFICATION")
    return newStatus === "APPROVED" || newStatus === "REJECTED";
  return false;
}

export function computeSubscriptionDates(durationMonths: number, from = new Date()) {
  const startDate = new Date(from);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return { startDate, endDate };
}
