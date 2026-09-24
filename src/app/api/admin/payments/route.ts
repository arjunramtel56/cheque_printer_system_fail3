export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { canTransition } from "@/modules/payments/validations";

async function checkAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};
    if (status) where.status = status as any;
    if (userId) where.userId = userId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true, role: true, status: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payment.count({ where });

    return NextResponse.json({ payments, total });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, rejectionReason } = body;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    // Fetch the payment with related user/plan data
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { user: true, plan: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Prevent re-processing an already finalized payment (duplicate approval prevention)
    if (!canTransition(payment.status, status)) {
      return NextResponse.json(
        { error: `Payment is already ${payment.status}. Cannot change status again.` },
        { status: 409 }
      );
    }

    // Security: admin cannot approve their own payment
    if (payment.userId === user.id) {
      return NextResponse.json({ error: "You cannot verify your own payment." }, { status: 403 });
    }

    if (status === "APPROVED") {
      const subStartDate = new Date();
      const subEndDate = new Date(subStartDate);
      subEndDate.setMonth(subEndDate.getMonth() + payment.durationMonths);

      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id },
          data: {
            status: "APPROVED",
            reviewedAt: subStartDate,
            reviewedBy: user.id,
            rejectionReason: null,
          },
        });

        // Upsert the user's subscription — activate/renew server-side
        const existingSubscription = await tx.subscription.findUnique({
          where: { userId: payment.userId },
        });

        if (existingSubscription) {
          await tx.subscription.update({
            where: { userId: payment.userId },
            data: {
              planId: payment.planId,
              startDate: subStartDate,
              endDate: subEndDate,
              isActive: true,
            },
          });
        } else {
          await tx.subscription.create({
            data: {
              userId: payment.userId,
              planId: payment.planId,
              startDate: subStartDate,
              endDate: subEndDate,
              isActive: true,
            },
          });
        }

        // Promote the user role from TRIAL_USER to USER if applicable
        if (payment.user.role === "TRIAL_USER") {
          await tx.user.update({
            where: { id: payment.userId },
            data: { role: "USER", status: "ACTIVE" },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "PAYMENT_APPROVED",
            entity: "Payment",
            entityId: payment.id,
            details: JSON.stringify({
              paymentId: payment.id,
              planId: payment.planId,
              amount: Number(payment.amount),
              durationMonths: payment.durationMonths,
              subStartDate: subStartDate.toISOString(),
              subEndDate: subEndDate.toISOString(),
            }),
          },
        });

        return updatedPayment;
      });

      return NextResponse.json({
        message: "Payment approved and subscription activated.",
        payment: result,
        reviewer: { id: user.id, name: user.name },
      });
    }

    if (status === "REJECTED") {
      const rejectedReason = rejectionReason?.trim() || null;

      const updatedPayment = await prisma.$transaction(async (tx) => {
        const upd = await tx.payment.update({
          where: { id },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedBy: user.id,
            rejectionReason: rejectedReason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "PAYMENT_REJECTED",
            entity: "Payment",
            entityId: payment.id,
            details: JSON.stringify({
              rejectionReason: rejectedReason,
            }),
          },
        });

        return upd;
      });

      return NextResponse.json({
        message: "Payment rejected.",
        payment: updatedPayment,
        reviewer: { id: user.id, name: user.name },
      });
    }

    return NextResponse.json({ error: "Unhandled status" }, { status: 400 });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
