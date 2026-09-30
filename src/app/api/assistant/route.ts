export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { answerQuestion } from "@/lib/assistant/knowledge";

/**
 * Deterministic cheque-assistant endpoint.
 *
 * Replaces the previous LLM-backed /api/agent route, which required an
 * OPENAI_API_KEY the deployment does not have (every request failed with
 * "An error occurred."). This route answers from a curated knowledge module
 * built from the application's own configuration — no external AI service,
 * no keys, no streaming infrastructure.
 *
 * Security posture:
 *  - session required (same session gate the old route used)
 *  - suspended/expired accounts rejected
 *  - 20 req/min per-user rate limit (kept from the old route)
 *  - input validated and length-capped; nothing is stored
 *  - answers can only come from the knowledge module — no model output to leak
 *    other users' data, and trial users get no user/admin-only information
 */

const bodySchema = z.object({
  question: z.string().min(1).max(1000),
  locale: z.enum(["en", "ne"]).optional(),
});

const MAX_REQUESTS_PER_MINUTE = 20;

function isRateLimited(userId: string): boolean {
  const store = globalThis as typeof globalThis & {
    __assistantRateLimit?: Record<string, { count: number; start: number }>;
  };
  if (!store.__assistantRateLimit) store.__assistantRateLimit = {};
  const now = Date.now();
  const entry = store.__assistantRateLimit[userId];
  if (entry && now - entry.start < 60000) {
    if (entry.count >= MAX_REQUESTS_PER_MINUTE) return true;
    entry.count++;
  } else {
    store.__assistantRateLimit[userId] = { count: 1, start: now };
  }
  return false;
}

export async function POST(req: NextRequest) {
  // 1) Authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = String((session.user as any).id);
  const role = String((session.user as any).role ?? "USER");
  const status = (session.user as any).status as string | undefined;

  // 2) Account-state gate (kept from the old route)
  if (status === "EXPIRED" || status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Your account is inactive. Please contact support.", requiresUpgrade: true },
      { status: 403 }
    );
  }

  // 3) Rate limit
  if (isRateLimited(userId)) {
    return NextResponse.json(
      { error: "You're sending questions too quickly. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  // 4) Validate input
  let parsed: z.infer<typeof bodySchema>;
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      const first = result.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { question, locale } = parsed;

  // 5) Trial eligibility — confirm the session user still exists and pick up
  //    their role server-side (never trust the client's claim).
  let isTrial = role === "TRIAL_USER";
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "Account not found." }, { status: 403 });
    }
    isTrial = dbUser.role === "TRIAL_USER";
  } catch {
    // DB hiccup: fall back to the JWT role; the knowledge module holds no
    // user-specific data, so nothing sensitive can leak either way.
  }

  // 6) Deterministic answer from the curated knowledge base
  const lang: "en" | "ne" = locale === "ne" ? "ne" : "en";
  try {
    const answer = await answerQuestion(question, lang, { role, isTrial });
    return NextResponse.json({
      answer: answer.text,
      source: answer.source,
      suggestions: answer.suggestions ?? null,
    });
  } catch (error) {
    console.error("Assistant error:", error);
    return NextResponse.json(
      {
        error:
          lang === "ne"
            ? "सहायकले जवाफ तयार गर्न सकेन। कृपया फेरि प्रयास गर्नुहोस्।"
            : "The assistant couldn't prepare an answer. Please try again.",
      },
      { status: 500 }
    );
  }
}
