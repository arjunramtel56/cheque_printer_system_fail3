import { z } from "zod";

export const chequeSchema = z.object({
  payeeName: z.string().trim().min(1).max(100),
  chequeDate: z.coerce.date(),
  amountFigure: z.coerce.number().positive().max(99_99_99_999.99),
  amountWords: z.string().trim().min(1).max(300),
  chequeNumber: z.string().trim().max(20).optional().or(z.literal("")),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("PORTRAIT"),
  offsetXmm: z.coerce.number().min(-30).max(30).default(0),
  offsetYmm: z.coerce.number().min(-30).max(30).default(0),
  templateId: z.string().cuid().optional(),
  status: z.enum(["DRAFT", "READY", "PRINTED", "CANCELLED"]).default("DRAFT"),
});

export type ChequeInput = z.infer<typeof chequeSchema>;
