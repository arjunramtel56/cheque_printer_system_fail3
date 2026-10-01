import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin reports API — real database aggregates for a date range.
 * Every figure is computed server-side with Prisma aggregations; nothing is
 * estimated or fabricated. Defaults to the last 30 days.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    // include the whole end day
    to.setHours(23, 59, 59, 999);

    const [
      newUsers,
      newCheques,
      prints,
      approvedPayments,
      pendingPayments,
      rejectedPayments,
      revenueAgg,
      statusGroups,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.chequeEntry.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.printHistory.count({ where: { printedAt: { gte: from, lte: to } } }),
      prisma.payment.count({
        where: { status: "APPROVED", submittedAt: { gte: from, lte: to } },
      }),
      prisma.payment.count({
        where: { status: "PENDING_VERIFICATION", submittedAt: { gte: from, lte: to } },
      }),
      prisma.payment.count({
        where: { status: "REJECTED", submittedAt: { gte: from, lte: to } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "APPROVED", submittedAt: { gte: from, lte: to } },
      }),
      prisma.chequeEntry.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      newUsers,
      newCheques,
      prints,
      payments: {
        approved: approvedPayments,
        pending: pendingPayments,
        rejected: rejectedPayments,
      },
      revenueApproved: Number(revenueAgg._sum?.amount) || 0,
      chequesByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    });
  } catch (error) {
    console.error("Error building reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
