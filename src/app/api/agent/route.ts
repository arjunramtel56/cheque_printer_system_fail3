// @ts-nocheck
export const runtime = "nodejs";

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { amountToWords } from "@/lib/amount-to-words";
import { CHEQUE_AGENT_PROMPT } from "@/lib/ai/prompts";
import { z } from "zod";
import { tool } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 30;

const MAX_REQUESTS_PER_MINUTE = 20;

function isRateLimited(userId: string): boolean {
  if (!globalThis.__rateLimit) {
    globalThis.__rateLimit = {};
  }
  const now = Date.now();
  const key = `agent:${userId}`;
  const entry = globalThis.__rateLimit[key];

  if (entry && now - entry.start < 60000) {
    if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
      return true;
    }
    entry.count++;
  } else {
    globalThis.__rateLimit[key] = { count: 1, start: now };
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const status = (session.user as any).status;

  if (isRateLimited(userId)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (status === "EXPIRED" || status === "SUSPENDED") {
    return new Response(
      JSON.stringify({
        error: "Your account is inactive. Please contact support.",
        requiresUpgrade: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${CHEQUE_AGENT_PROMPT}\nCurrent user role: ${role}. Never reveal other users' data.`,
    messages,
    tools: {
      convertAmount: tool({
        description:
          "Convert a numeric amount into words for cheque printing (English with Indian numbering: lakh, crore).",
        parameters: z.object({
          amount: z.number().positive(),
          language: z.enum(["en", "ne"]).optional().default("en"),
        }),
        execute: async ({ amount, language = "en" }) => ({
          words: amountToWords(amount, language),
        }),
      }),

      validateCheque: tool({
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
          if (chequeNumber && chequeNumber.length < 1)
            errors.push("Cheque number cannot be empty.");
          return { valid: errors.length === 0, errors };
        },
      }),

      getMyCheques: tool({
        description: "List recent cheques for the current user.",
        parameters: z.object({
          limit: z.number().min(1).max(20).default(5),
          status: z.enum(["DRAFT", "PRINTED", "CANCELLED"]).optional(),
        }),
        execute: async ({ limit, status }) => {
          const where: any = { userId };
          if (status) where.status = status;

          const cheques = await prisma.chequeEntry.findMany({
            where,
            take: limit,
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
      }),

      createChequeDraft: tool({
        description: "Create a cheque draft for the current user.",
        parameters: z.object({
          payeeName: z.string().min(1),
          amount: z.number().positive(),
          date: z.string(),
          templateId: z.string().optional(),
          chequeNumber: z.string().optional(),
          accountHolder: z.string().optional(),
        }),
        execute: async ({ payeeName, amount, date, templateId, chequeNumber, accountHolder }) => {
          const subscription = await prisma.subscription.findUnique({
            where: { userId },
            include: { plan: true },
          });

          if (!subscription || !subscription.isActive) {
            return {
              error: "No active subscription found. Please upgrade your plan.",
              requiresUpgrade: true,
            };
          }

          const printCount = await prisma.printHistory.count({
            where: { userId },
          });

          if (subscription.plan.chequeLimit > 0 && printCount >= subscription.plan.chequeLimit) {
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
              userId,
              payeeName,
              amountNumber: amount,
              amountWords: amountToWords(amount),
              chequeDate: new Date(date),
              chequeNumber: chequeNumber || null,
              accountHolder: accountHolder || "",
              templateId: templateId || defaultTemplate?.id || "",
              status: "DRAFT",
            },
          });

          await prisma.auditLog.create({
            data: {
              userId,
              action: "CHEQUE_DRAFT_CREATED_BY_AGENT",
              entity: "ChequeEntry",
              entityId: cheque.id,
              details: JSON.stringify({ source: "agent" }),
            },
          });

          return { id: cheque.id, message: "Cheque draft created successfully." };
        },
      }),

      listAuditLogs: tool({
        description: "List recent audit log entries. Admin only.",
        parameters: z.object({
          limit: z.number().min(1).max(50).default(20),
          action: z.string().optional(),
          entity: z.string().optional(),
        }),
        execute: async ({ limit, action, entity }) => {
          if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return { error: "Admin access required to view audit logs." };
          }

          const where: any = {};
          if (action) where.action = action;
          if (entity) where.entity = entity;

          const logs = await prisma.auditLog.findMany({
            where,
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          });
          return { logs };
        },
      }),

      createTemplate: tool({
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
            })
          ),
        }),
        execute: async ({ bankId, name, chequeWidth, chequeHeight, isDefault, fields }) => {
          if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return { error: "Admin access required to create templates." };
          }

          const bank = await prisma.bank.findUnique({ where: { id: bankId } });
          if (!bank) {
            return { error: "Bank not found." };
          }

          const template = await prisma.bankTemplate.create({
            data: {
              bankId,
              name,
              chequeWidth,
              chequeHeight,
              isDefault,
              fields: {
                create: fields,
              },
            },
          });

          return { id: template.id, message: `Template '${name}' created successfully.` };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimit: Record<string, { count: number; start: number }> | undefined;
}
