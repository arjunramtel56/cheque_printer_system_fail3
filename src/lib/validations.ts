import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    company: z.string().optional(),
    phone: z.string().optional(),
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
