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

    const history = await prisma.printHistory.findMany({
      where: { userId: user.id },
      include: {
        cheque: {
          include: {
            template: { include: { bank: true } },
          },
        },
      },
      orderBy: { printedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching print history:", error);
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
    const { chequeId, copies, printerName, notes } = body;

    if (!chequeId) {
      return NextResponse.json({ error: "Cheque ID is required" }, { status: 400 });
    }

    const cheque = await prisma.chequeEntry.findUnique({
      where: { id: chequeId },
    });

    if (!cheque) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    if (cheque.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chequeEntry.update({
      where: { id: chequeId },
      data: {
        status: "PRINTED",
        lastPrintedAt: new Date(),
      },
    });

    const history = await prisma.printHistory.create({
      data: {
        userId: user.id,
        chequeId,
        copies: copies || 1,
        printerName: printerName || null,
        notes: notes || null,
      },
      include: {
        cheque: {
          include: {
            template: { include: { bank: true } },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PRINT_CHEQUE",
        entity: "ChequeEntry",
        entityId: chequeId,
        details: JSON.stringify({ copies, printerName }),
      },
    });

    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    console.error("Error recording print history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
