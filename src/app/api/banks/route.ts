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
    const banks = await prisma.bank.findMany({
      where: { isActive: true },
      include: {
        templates: {
          where: { isActive: true },
          include: {
            fields: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(banks);
  } catch (error) {
    console.error("Error fetching banks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
