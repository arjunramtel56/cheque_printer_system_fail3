import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  company: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const chequeSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  accountHolder: z.string().min(1, "Account holder name is required"),
  payeeName: z.string().optional(),
  chequeDate: z.string().min(1, "Date is required"),
  amountNumber: z.number().positive("Amount must be positive"),
  amountWords: z.string().min(1, "Amount in words is required"),
  chequeNumber: z.string().optional(),
  memo: z.string().optional(),
  isCrossed: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChequeInput = z.infer<typeof chequeSchema>;
