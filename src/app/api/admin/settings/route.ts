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
    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: "asc" },
    });

    const systemConfig = settings.reduce((acc: Record<string, any>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return NextResponse.json({
      settings: systemConfig,
      raw: settings,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
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
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const existing = await prisma.systemSettings.findUnique({ where: { key } });

    let setting;
    if (existing) {
      setting = await prisma.systemSettings.update({
        where: { key },
        data: {
          value: typeof value === "string" ? JSON.parse(value) : value,
          ...(description !== undefined && { description }),
        },
      });
    } else {
      setting = await prisma.systemSettings.create({
        data: {
          key,
          value: typeof value === "string" ? JSON.parse(value) : value,
          description: description || null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_SYSTEM_SETTING",
        entity: "SystemSettings",
        entityId: setting.id,
        details: JSON.stringify({ key, value }),
      },
    });

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error("Error updating system settings:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Setting already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
