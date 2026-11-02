import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name is too long"),
    email: z.string().email("Invalid email address").max(320, "Email is too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().max(128, "Password is too long"),
    company: z.string().max(255, "Company name is too long").optional(),
    phone: z.string().max(64, "Phone number is too long").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const chequeSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  payeeName: z.string().min(1, "Payee name is required"),
  chequeDate: z.string().min(1, "Date is required"),
  amountNumber: z.coerce.number().positive("Amount must be positive"),
  amountWords: z.string().min(1, "Amount in words is required"),
  chequeNumber: z.string().optional(),
  accountHolder: z.string().optional(),
});

export const chequeUpdateSchema = z.object({
  id: z.string().min(1, "Cheque ID is required"),
  templateId: z.string().optional(),
  payeeName: z.string().optional(),
  chequeDate: z.string().optional(),
  amountNumber: z.coerce.number().positive("Amount must be positive").optional(),
  amountWords: z.string().optional(),
  chequeNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  status: z.enum(["DRAFT", "PRINTED", "CANCELLED"]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChequeInput = z.infer<typeof chequeSchema>;
export type ChequeUpdateInput = z.infer<typeof chequeUpdateSchema>;

/**
 * Template background image URL.
 *
 * Admin-entered values are rendered as <img src>, CSS url(...) and fetched
 * server-side by the PDF renderer, so only safe schemes may enter the DB:
 * http(s) absolute URLs (admin-hosted assets) and root-relative app paths
 * (e.g. /uploads/templates/…, /images/…). Anything else (data:, javascript:,
 * file:, protocol-relative //host) is rejected before storage.
 */
export function isValidBackgroundUrl(url: string): boolean {
  if (url.startsWith("/")) return !url.startsWith("//") && !url.startsWith("/\\");
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
