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
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: {
        defaultBank: { include: { templates: true } },
        defaultTemplate: { include: { bank: true, fields: true } },
      },
    });

    if (!settings) {
      return NextResponse.json({});
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
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
    const {
      defaultBankId,
      defaultTemplateId,
      defaultAccountName,
      language,
      dateFormat,
      currency,
      printerName,
    } = body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        defaultBankId: defaultBankId || null,
        defaultTemplateId: defaultTemplateId || null,
        defaultAccountName: defaultAccountName || null,
        language: language || "en",
        dateFormat: dateFormat || "YYYY-MM-DD",
        currency: currency || "NPR",
        printerName: printerName || null,
      },
      create: {
        userId: user.id,
        defaultBankId: defaultBankId || null,
        defaultTemplateId: defaultTemplateId || null,
        defaultAccountName: defaultAccountName || null,
        language: language || "en",
        dateFormat: dateFormat || "YYYY-MM-DD",
        currency: currency || "NPR",
        printerName: printerName || null,
      },
      include: {
        defaultBank: { include: { templates: true } },
        defaultTemplate: { include: { bank: true, fields: true } },
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
