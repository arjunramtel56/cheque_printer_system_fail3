// @ts-nocheck
export const runtime = "nodejs";

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { amountToWords } from "@/lib/amount-to-words";
import { CHEQUE_AGENT_PROMPT } from "@/lib/ai/prompts";
import { z } from "zod";
import { tool } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${CHEQUE_AGENT_PROMPT}\nCurrent user role: ${role}. Never reveal other users' data.`,
    messages,
    tools: {
      convertAmount: tool({
        description: "Convert a numeric amount into words for cheque printing.",
        parameters: z.object({
          amount: z.number().positive(),
        }),
        execute: async ({ amount }) => ({ words: amountToWords(amount) }),
      }),
      validateCheque: tool({
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
      }),
      getMyCheques: tool({
        description: "List recent cheques for the current user.",
        parameters: z.object({
          limit: z.number().min(1).max(20).default(5),
        }),
        execute: async ({ limit }) => {
          const cheques = await prisma.chequeEntry.findMany({
            where: { userId },
            take: limit,
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
        execute: async (data) => {
          const cheque = await prisma.chequeEntry.create({
            data: {
              userId,
              payeeName: data.payeeName,
              amountNumber: data.amount,
              amountWords: amountToWords(data.amount),
              chequeDate: new Date(data.date),
              chequeNumber: data.chequeNumber || null,
              accountHolder: data.accountHolder || "",
              templateId: data.templateId || "",
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

          return { id: cheque.id, message: "Cheque draft created." };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
