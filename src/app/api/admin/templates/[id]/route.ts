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
    return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, chequeWidth, chequeHeight, isDefault, isActive, backgroundUrl, fields } = body;

    const template = await prisma.bankTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(chequeWidth && { chequeWidth }),
        ...(chequeHeight && { chequeHeight }),
        ...(backgroundUrl !== undefined && { backgroundUrl }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
        ...(fields && {
          fields: {
            deleteMany: {},
            create: fields,
          },
        }),
      },
      include: {
        bank: true,
        fields: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_TEMPLATE",
        entity: "BankTemplate",
        entityId: id,
        details: JSON.stringify({ name, chequeWidth, chequeHeight, isDefault, isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Error updating template:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Template with this name already exists for this bank" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
  }

  try {
    await prisma.bankTemplate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_TEMPLATE",
        entity: "BankTemplate",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
