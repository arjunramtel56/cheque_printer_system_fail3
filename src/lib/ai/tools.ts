// @ts-nocheck
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { amountToWords } from "@/lib/amount-to-words";

export const convertAmountTool = tool({
  description: "Convert a numeric amount into words for cheque printing (English with Indian numbering: lakh, crore).",
  parameters: z.object({
    amount: z.number().positive(),
    language: z.enum(["en", "ne"]).optional().default("en"),
  }),
  execute: async ({ amount, language = "en" }) => {
    return { words: amountToWords(amount, language) };
  },
});

export const validateChequeTool = tool({
  description: "Validate cheque fields before creating a draft.",
  parameters: z.object({
    payeeName: z.string().min(1),
    amount: z.number().positive(),
    date: z.string(),
    chequeNumber: z.string().optional(),
  }),
  execute: async ({ payeeName, amount, date, chequeNumber }) => {
    const errors: string[] = [];
    if (!payeeName.trim()) errors.push("Payee name is required.");
    if (amount <= 0) errors.push("Amount must be greater than zero.");
    if (!date) errors.push("Date is required.");
    if (chequeNumber && chequeNumber.length < 1) errors.push("Cheque number cannot be empty.");
    return { valid: errors.length === 0, errors };
  },
});

export const getMyChequesTool = tool({
  description: "List recent cheques for the current user.",
  parameters: z.object({
    limit: z.number().min(1).max(20).default(5),
    status: z.enum(["DRAFT", "PRINTED", "CANCELLED"]).optional(),
  }),
  execute: async (params, { userId }) => {
    const where: any = { userId: userId as string };
    if (params.status) where.status = params.status;

    const cheques = await prisma.chequeEntry.findMany({
      where,
      take: params.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        payeeName: true,
        amountNumber: true,
        amountWords: true,
        chequeDate: true,
        chequeNumber: true,
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
    const subscription = await prisma.subscription.findUnique({
      where: { userId: userId as string },
      include: { plan: true },
    });

    if (!subscription || !subscription.isActive) {
      return {
        error: "No active subscription found. Please upgrade your plan.",
        requiresUpgrade: true,
      };
    }

    const printCount = await prisma.printHistory.count({
      where: { userId: userId as string },
    });

    if (
      subscription.plan.chequeLimit > 0 &&
      printCount >= subscription.plan.chequeLimit
    ) {
      return {
        error: `You have reached your plan limit of ${subscription.plan.chequeLimit} prints. Please upgrade your subscription.`,
        requiresUpgrade: true,
      };
    }

    const defaultTemplate = await prisma.bankTemplate.findFirst({
      where: { isDefault: true, isActive: true },
    });

    const cheque = await prisma.chequeEntry.create({
      data: {
        userId: userId as string,
        payeeName: params.payeeName,
        amountNumber: params.amount,
        amountWords: amountToWords(params.amount),
        chequeDate: new Date(params.date),
        chequeNumber: params.chequeNumber || null,
        accountHolder: params.accountHolder || "",
        templateId: params.templateId || defaultTemplate?.id || "",
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

    return { id: cheque.id, message: "Cheque draft created successfully." };
  },
});

export const listAuditLogsTool = tool({
  description: "List recent audit log entries. Admin only.",
  parameters: z.object({
    limit: z.number().min(1).max(50).default(20),
    action: z.string().optional(),
    entity: z.string().optional(),
    userId: z.string().optional(),
  }),
  execute: async (params, { role }) => {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { error: "Admin access required to view audit logs." };
    }

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = params.userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });

    return { logs };
  },
});

export const createTemplateTool = tool({
  description: "Create a new cheque template for a bank. Admin only.",
  parameters: z.object({
    bankId: z.string().min(1),
    name: z.string().min(1),
    chequeWidth: z.number().min(1).max(210).default(210),
    chequeHeight: z.number().min(1).max(297).default(90),
    isDefault: z.boolean().default(false),
    fields: z.array(
      z.object({
        field: z.string().min(1),
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        fontSize: z.number().default(12),
        fontFamily: z.string().default("Arial"),
        fontWeight: z.string().default("normal"),
        letterSpacing: z.number().optional(),
        align: z.string().default("left"),
        rotation: z.number().optional(),
        color: z.string().default("#000000"),
        format: z.string().optional(),
      }),
    ),
  }),
  execute: async (params, { role }) => {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { error: "Admin access required to create templates." };
    }

    const bank = await prisma.bank.findUnique({ where: { id: params.bankId } });
    if (!bank) {
      return { error: "Bank not found." };
    }

    const template = await prisma.bankTemplate.create({
      data: {
        bankId: params.bankId,
        name: params.name,
        chequeWidth: params.chequeWidth,
        chequeHeight: params.chequeHeight,
        isDefault: params.isDefault,
        fields: {
          create: params.fields,
        },
      },
    });

    return { id: template.id, message: `Template '${params.name}' created successfully.` };
  },
});
