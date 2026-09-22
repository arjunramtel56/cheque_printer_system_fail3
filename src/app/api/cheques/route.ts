export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { chequeSchema, chequeUpdateSchema } from "@/lib/validations";

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

    const parsed = chequeSchema.safeParse({
      templateId: body.templateId,
      payeeName: body.payeeName,
      chequeDate: body.chequeDate,
      amountNumber: body.amountNumber,
      amountWords: body.amountWords,
      chequeNumber: body.chequeNumber,
      accountHolder: body.accountHolder,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      templateId,
      payeeName,
      chequeDate,
      amountNumber,
      amountWords,
      chequeNumber,
      accountHolder,
    } = parsed.data;

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

    if (subscription.plan.chequeLimit > 0 && printCount >= subscription.plan.chequeLimit) {
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
        chequeNumber: chequeNumber || null,
        status: "DRAFT",
      },
      include: {
        template: { include: { bank: true, fields: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CHEQUE_CREATED",
        entity: "ChequeEntry",
        entityId: cheque.id,
        details: JSON.stringify({
          amount: parseFloat(amountNumber),
          payee: payeeName,
          chequeNumber: chequeNumber || null,
        }),
      },
    });

    return NextResponse.json(cheque, { status: 201 });
  } catch (error: any) {
    console.error("Error creating cheque:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Cheque number already exists for this user" },
        { status: 409 }
      );
    }
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

    const parsed = chequeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      id,
      payeeName,
      chequeDate,
      amountNumber,
      amountWords,
      chequeNumber,
      accountHolder,
      status,
    } = parsed.data;

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
        payeeName: payeeName ?? null,
        chequeDate: chequeDate ? new Date(chequeDate) : existing.chequeDate,
        amountNumber: amountNumber !== undefined ? parseFloat(amountNumber) : existing.amountNumber,
        amountWords: amountWords !== undefined ? amountWords : existing.amountWords,
        chequeNumber: chequeNumber ?? existing.chequeNumber,
        accountHolder: accountHolder ?? existing.accountHolder,
        status: status || existing.status,
      },
      include: {
        template: { include: { bank: true, fields: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CHEQUE_UPDATED",
        entity: "ChequeEntry",
        entityId: id,
        details: JSON.stringify({ status, chequeNumber }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating cheque:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Cheque number already exists for this user" },
        { status: 409 }
      );
    }
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

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CHEQUE_DELETED",
        entity: "ChequeEntry",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cheque:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
