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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const payees = await prisma.payee.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(payees);
  } catch (error) {
    console.error("Error fetching payees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address, phone, email, bankAccount, chequeLimit } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const payee = await prisma.payee.create({
      data: {
        userId: user.id,
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        bankAccount: bankAccount || null,
        chequeLimit: chequeLimit ? parseFloat(chequeLimit) : null,
      },
    });

    return NextResponse.json(payee, { status: 201 });
  } catch (error) {
    console.error("Error creating payee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, address, phone, email, bankAccount, chequeLimit } = body;

    if (!id) {
      return NextResponse.json({ error: "Payee ID is required" }, { status: 400 });
    }

    const existing = await prisma.payee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.payee.update({
      where: { id },
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        bankAccount: bankAccount || null,
        chequeLimit: chequeLimit ? parseFloat(chequeLimit) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating payee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Payee ID is required" }, { status: 400 });
    }

    const existing = await prisma.payee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }

    if (existing.userId !== user.id && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.payee.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
