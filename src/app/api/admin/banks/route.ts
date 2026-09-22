export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";

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
    const banks = await prisma.bank.findMany({
      include: {
        templates: {
          include: { fields: true },
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

export async function POST(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, logoUrl, isActive } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const bank = await prisma.bank.create({
      data: {
        name,
        code: code.toUpperCase(),
        logoUrl: logoUrl || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        templates: { include: { fields: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_BANK",
        entity: "Bank",
        entityId: bank.id,
        details: JSON.stringify({ name, code }),
      },
    });

    return NextResponse.json(bank, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bank:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bank code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
