import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { amountToWords } from "@/lib/amount-to-words";

export const convertAmountTool = tool({
  description: "Convert a numeric amount into words for cheque printing.",
  parameters: z.object({
    amount: z.number().positive(),
  }),
  execute: async ({ amount }) => {
    return { words: amountToWords(amount) };
  },
});

export const validateChequeTool = tool({
  description: "Validate cheque fields before creating a draft.",
  parameters: z.object({
    payeeName: z.string().min(1),
    amount: z.number().positive(),
    date: z.string(),
  }),
  execute: async ({ payeeName, amount, date }) => {
    const errors: string[] = [];
    if (!payeeName.trim()) errors.push("Payee name is required.");
    if (amount <= 0) errors.push("Amount must be greater than zero.");
    if (!date) errors.push("Date is required.");
    return { valid: errors.length === 0, errors };
  },
});

export const getMyChequesTool = tool({
  description: "List recent cheques for the current user.",
  parameters: z.object({
    limit: z.number().min(1).max(20).default(5),
  }),
  execute: async (params, { userId }) => {
    const cheques = await prisma.chequeEntry.findMany({
      where: { userId: userId as string },
      take: params.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        payeeName: true,
        amountNumber: true,
        amountWords: true,
        chequeDate: true,
        status: true,
        createdAt: true,
      },
    });
    return { cheques };
  },
});

export const createChequeDraftTool = tool({
  description: "Create a cheque draft for the current user.",
  parameters: z.object({
    payeeName: z.string().min(1),
    amount: z.number().positive(),
    date: z.string(),
    templateId: z.string().optional(),
    chequeNumber: z.string().optional(),
    accountHolder: z.string().optional(),
  }),
  execute: async (params, { userId }) => {
    const cheque = await prisma.chequeEntry.create({
      data: {
        userId: userId as string,
        payeeName: params.payeeName,
        amountNumber: params.amount,
        amountWords: amountToWords(params.amount),
        chequeDate: new Date(params.date),
        chequeNumber: params.chequeNumber || null,
        accountHolder: params.accountHolder || "",
        templateId: params.templateId || "",
        status: "DRAFT",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: userId as string,
        action: "CHEQUE_DRAFT_CREATED_BY_AGENT",
        entity: "ChequeEntry",
        entityId: cheque.id,
        details: JSON.stringify({ source: "agent" }),
      },
    });

    return { id: cheque.id, message: "Cheque draft created." };
  },
});
