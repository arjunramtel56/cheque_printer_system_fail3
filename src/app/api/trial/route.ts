export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const trialExpired = dbUser.trialExpires ? new Date(dbUser.trialExpires) < now : false;

    // Count prints used in trial
    const printsUsed = await prisma.printHistory.count({
      where: { userId: dbUser.id },
    });

    const trialPlan = dbUser.subscription?.plan;
    const chequeLimit = trialPlan?.chequeLimit ?? 10;
    const printsLeft = Math.max(0, chequeLimit - printsUsed);

    const daysLeft = dbUser.trialExpires
      ? Math.max(
          0,
          Math.ceil(
            (new Date(dbUser.trialExpires).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    return NextResponse.json({
      isActive: dbUser.role === "TRIAL_USER" && !trialExpired,
      trialExpires: dbUser.trialExpires,
      daysLeft,
      printsUsed,
      printsLeft,
      chequeLimit,
      isExpired: trialExpired,
      plan: trialPlan
        ? {
            name: trialPlan.name,
            description: trialPlan.description,
            chequeLimit: trialPlan.chequeLimit,
            features: trialPlan.features,
          }
        : null,
      subscriptionActive: dbUser.subscription?.isActive ?? false,
    });
  } catch (error) {
    console.error("Error fetching trial info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: { include: { plan: true } } },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only TRIAL_USER role can activate a trial
    if (dbUser.role !== "TRIAL_USER") {
      return NextResponse.json(
        {
          message: "You are not eligible for a trial.",
          isActive: false,
        },
        { status: 200 }
      );
    }

    // Check if already has an active subscription (non-expired)
    const now = new Date();
    if (dbUser.trialExpires && new Date(dbUser.trialExpires) > now) {
      return NextResponse.json(
        {
          message: "Trial is already active.",
          isActive: true,
          trialExpires: dbUser.trialExpires,
        },
        { status: 200 }
      );
    }

    // Re-activate trial if eligible (only if user has no paid subscription)
    if (
      dbUser.subscription &&
      dbUser.subscription.isActive &&
      Number(dbUser.subscription.plan.price) > 0
    ) {
      return NextResponse.json(
        {
          message: "You already have an active paid subscription.",
          isActive: true,
        },
        { status: 200 }
      );
    }

    // Activate/refresh trial
    let trialPlan = await prisma.plan.findUnique({ where: { name: "trial" } });
    if (!trialPlan) {
      trialPlan = await prisma.plan.create({
        data: {
          name: "trial",
          description: "14-day free trial with 10 cheque prints",
          price: 0,
          durationDays: 14,
          chequeLimit: 10,
          features: JSON.stringify({ templates: "basic", export: false, bulkPrint: false }),
        },
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + trialPlan.durationDays * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        trialExpires: endDate,
        status: "ACTIVE",
      },
    });

    // Update or create subscription
    if (dbUser.subscription) {
      await prisma.subscription.update({
        where: { userId: dbUser.id },
        data: {
          planId: trialPlan.id,
          startDate,
          endDate,
          isActive: true,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: dbUser.id,
          planId: trialPlan.id,
          startDate,
          endDate,
          isActive: true,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        action: "TRIAL_ACTIVATED",
        entity: "User",
        entityId: dbUser.id,
        details: JSON.stringify({ trialExpires: endDate }),
      },
    });

    return NextResponse.json(
      {
        message: "Trial activated successfully.",
        isActive: true,
        trialExpires: endDate,
        daysLeft: trialPlan.durationDays,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error activating trial:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
