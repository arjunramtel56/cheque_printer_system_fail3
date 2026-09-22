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
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");

    const where = bankId ? { bankId } : {};

    const templates = await prisma.bankTemplate.findMany({
      where,
      include: {
        bank: true,
        fields: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
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
    const { bankId, name, chequeWidth, chequeHeight, isDefault, fields } = body;

    if (!bankId || !name) {
      return NextResponse.json({ error: "Bank ID and name are required" }, { status: 400 });
    }

    const bankExists = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bankExists) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    const template = await prisma.bankTemplate.create({
      data: {
        bankId,
        name,
        chequeWidth: chequeWidth || 210,
        chequeHeight: chequeHeight || 90,
        isDefault: isDefault || false,
        fields: {
          create: fields || [],
        },
      },
      include: {
        bank: true,
        fields: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_TEMPLATE",
        entity: "BankTemplate",
        entityId: template.id,
        details: JSON.stringify({ name, bankId, chequeWidth, chequeHeight, isDefault }),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("Error creating template:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Template with this name already exists for this bank" },
        { status: 409 }
      );
    }
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
    const { id, name, chequeWidth, chequeHeight, isDefault, isActive, fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const template = await prisma.bankTemplate.update({
      where: { id },
      data: {
        name: name || undefined,
        chequeWidth: chequeWidth || undefined,
        chequeHeight: chequeHeight || undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await checkAdmin(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

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
