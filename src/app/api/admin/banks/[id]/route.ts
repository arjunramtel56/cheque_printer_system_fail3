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

export async function PUT(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return NextResponse.json({ error: "Bank ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, logoUrl, isActive } = body;

    const bank = await prisma.bank.update({
      where: { id },
      data: {
        name,
        code: code?.toUpperCase(),
        logoUrl: logoUrl || null,
        isActive,
      },
      include: {
        templates: { include: { fields: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_BANK",
        entity: "Bank",
        entityId: id,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json(bank);
  } catch (error: any) {
    console.error("Error updating bank:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bank code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return NextResponse.json({ error: "Bank ID is required" }, { status: 400 });
  }

  try {
    await prisma.bank.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_BANK",
        entity: "Bank",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bank:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
