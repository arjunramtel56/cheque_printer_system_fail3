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

  const { searchParams } = new URL(request.url);
  const exportCsv = searchParams.get("export") === "csv";

  try {
    if (exportCsv) {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const csvLines = [
        "Date,User,Action,Entity,Entity ID,Details",
        ...logs.map((log) =>
          [
            `"${log.createdAt.toISOString()}"`,
            `"${log.user?.name || "System"}"`,
            `"${log.action}"`,
            `"${log.entity}"`,
            `"${log.entityId || ""}"`,
            `"${(log.details || "").toString().replace(/"/g, '""')}"`,
          ].join(","),
        ),
      ];

      const csv = csvLines.join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=audit-logs.csv",
        },
      });
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count({ where });

    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error("Error processing audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
