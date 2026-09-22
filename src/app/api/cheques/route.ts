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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { userId: user.id };
    if (status) where.status = status as any;

    const cheques = await prisma.chequeEntry.findMany({
      where,
      include: {
        template: {
          include: { bank: true, fields: true },
        },
        printHistories: {
          orderBy: { printedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(cheques);
  } catch (error) {
    console.error("Error fetching cheques:", error);
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
    const { templateId, payeeName, chequeDate, amountNumber, amountWords, accountHolder } = body;

    if (!templateId || !chequeDate || amountNumber === undefined) {
      return NextResponse.json(
        { error: "Template ID, date, and amount are required" },
        { status: 400 }
      );
    }

    const template = await prisma.bankTemplate.findUnique({
      where: { id: templateId },
      include: { bank: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    });

    if (!subscription || !subscription.isActive) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 403 });
    }

    const printCount = await prisma.printHistory.count({
      where: { userId: user.id },
    });

    if (printCount >= subscription.plan.chequeLimit) {
      return NextResponse.json(
        { error: "Cheque print limit reached. Please upgrade your subscription." },
        { status: 403 }
      );
    }

    const cheque = await prisma.chequeEntry.create({
      data: {
        userId: user.id,
        templateId,
        accountHolder: accountHolder || user.name || "",
        payeeName: payeeName || null,
        chequeDate: new Date(chequeDate),
        amountNumber: parseFloat(amountNumber),
        amountWords: amountWords || "",
        status: "DRAFT",
      },
      include: {
        template: { include: { bank: true, fields: true } },
      },
    });

    return NextResponse.json(cheque, { status: 201 });
  } catch (error) {
    console.error("Error creating cheque:", error);
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
    const { id, payeeName, chequeDate, amountNumber, amountWords, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Cheque ID is required" }, { status: 400 });
    }

    const existing = await prisma.chequeEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    if (existing.userId !== user.id && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.chequeEntry.update({
      where: { id },
      data: {
        payeeName: payeeName || null,
        chequeDate: chequeDate ? new Date(chequeDate) : existing.chequeDate,
        amountNumber: amountNumber !== undefined ? parseFloat(amountNumber) : existing.amountNumber,
        amountWords: amountWords !== undefined ? amountWords : existing.amountWords,
        status: status || existing.status,
      },
      include: {
        template: { include: { bank: true, fields: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating cheque:", error);
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
      return NextResponse.json({ error: "Cheque ID is required" }, { status: 400 });
    }

    const existing = await prisma.chequeEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    if (existing.userId !== user.id && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chequeEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cheque:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
