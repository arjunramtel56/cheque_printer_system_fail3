export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { generateChequePDF } from "@/lib/cheque-pdf";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chequeId } = body;

    if (!chequeId) {
      return NextResponse.json({ error: "Cheque ID is required" }, { status: 400 });
    }

    const cheque = await prisma.chequeEntry.findUnique({
      where: { id: chequeId },
      include: {
        template: { include: { bank: true, fields: true } },
      },
    });

    if (!cheque) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    if (cheque.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fields: Record<string, string> = {
      date: formatDate(cheque.chequeDate.toISOString().split("T")[0]),
      payee: cheque.payeeName || "",
      amountWords: cheque.amountWords,
      amountNumber: `Rs. ${Number(cheque.amountNumber).toFixed(2)}`,
      name: cheque.accountHolder || "",
    };

    const pdfBytes = await generateChequePDF(cheque, fields);

    return new NextResponse(pdfBytes as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cheque-${cheque.id}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatDate(date: string) {
  if (!date) return "DDMMYYYY";
  const [year, month, day] = date.split("-");
  return `${day}${month}${year}`;
}
