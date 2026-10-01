import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin plans API — read-only view of the plan catalogue plus live
 * consistency data (active subscription counts per plan).
 *
 * Paid-plan pricing is defined by src/lib/pricing.ts (single source of truth,
 * charged server-side). The Plan rows here exist for trial/legacy limits; the
 * catalogue is read-only from the admin panel because editable plan pricing
 * would silently diverge from the pricing module the payment API enforces.
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
    const plans = await prisma.plan.findMany({
      orderBy: [{ isActive: "desc" }, { price: "asc" }],
      include: {
        _count: {
          select: {
            subscriptions: { where: { isActive: true } },
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
