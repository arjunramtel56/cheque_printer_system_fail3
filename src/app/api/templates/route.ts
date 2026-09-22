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

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
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
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { bankId, name, chequeWidth, chequeHeight, isDefault, fields } = body;

    if (!bankId || !name) {
      return NextResponse.json({ error: "Bank ID and name are required" }, { status: 400 });
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

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
