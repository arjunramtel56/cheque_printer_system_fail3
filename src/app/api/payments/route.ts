export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { VALID_PAYMENT_METHODS } from "@/modules/payments/validations";
import { getAmountDue, isPaidPlan, VALID_DURATIONS } from "@/lib/pricing";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    // Users can only see their own payments; admins can specify userId
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      if (userId) where.userId = userId;
    } else {
      where.userId = user.id;
    }

    if (status) where.status = status as any;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const planName = formData.get("plan") as string;
    const durationStr = formData.get("duration") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const reference = (formData.get("reference") as string) || "";
    const notes = (formData.get("notes") as string) || "";
    const currency = formData.get("currency") as string;
    const proofFile = formData.get("proof") as File | null;

    if (!planName) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    const duration = parseInt(durationStr || "1");
    if (isNaN(duration) || !VALID_DURATIONS.includes(duration as any)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Resolve plan (must be an active paid plan)
    const plan = await prisma.plan.findFirst({
      where: { name: planName, isActive: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    if (!isPaidPlan(planName)) {
      return NextResponse.json({ error: "Selected plan is not a paid plan" }, { status: 400 });
    }

    // Validate payment method
    const rawMethod = (paymentMethod || "FONEPAY").toUpperCase();
    if (!VALID_PAYMENT_METHODS.includes(rawMethod as any)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    const paymentMethodEnum: "FONEPAY" | "BANK_TRANSFER" | "CASH" | "OTHER" = rawMethod as any;

    // Validate reference is provided and non-empty
    if (!reference.trim()) {
      return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
    }

    if (reference.length > 200) {
      return NextResponse.json({ error: "Transaction reference too long" }, { status: 400 });
    }

    // Validate notes length if provided
    if (notes.length > 1000) {
      return NextResponse.json({ error: "Notes too long" }, { status: 400 });
    }

    // Amount due is computed SERVER-SIDE from the pricing module.
    // The client-provided amount (if any) is ignored except as an
    // informational echo — it can never override the real price.
    const amountDue = getAmountDue(planName, duration);
    if (amountDue === null) {
      return NextResponse.json({ error: "Invalid plan or duration" }, { status: 400 });
    }
    const amount = amountDue;

    let proofUrl: string | null = null;

    if (proofFile) {
      if (proofFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(proofFile.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only PNG, JPEG, GIF, WebP allowed." },
          { status: 400 }
        );
      }

      // Store OUTSIDE public/ — proof images are only served through the
      // authenticated /api/payments/proof/[filename] route.
      const uploadDir = join(process.cwd(), ".data", "payment-proofs");
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const ext = (proofFile.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
      const filename = `pay_${randomUUID()}.${ext}`;
      const filepath = join(uploadDir, filename);

      const buffer = Buffer.from(await proofFile.arrayBuffer());
      writeFileSync(filepath, buffer);

      proofUrl = `/api/payments/proof/${filename}`;
    } else {
      // Payment proof is required for all manual payment methods
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: user.id,
          planId: plan.id,
          amount: amount,
          currency: currency || plan.currency || "NPR",
          paymentMethod: paymentMethodEnum,
          durationMonths: duration,
          proofUrl: proofUrl,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          status: "PENDING_VERIFICATION",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PAYMENT_SUBMITTED",
          entity: "Payment",
          entityId: created.id,
          details: JSON.stringify({
            planId: plan.id,
            amount: amount,
            durationMonths: duration,
            paymentMethod: paymentMethodEnum,
            hasProof: !!proofUrl,
          }),
        },
      });

      return created;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error submitting payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
