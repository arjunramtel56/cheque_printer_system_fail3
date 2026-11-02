export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";

const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER", "TRIAL_USER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "PENDING_VERIFICATION"]).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email("Invalid email address").max(320).optional(),
  phone: z.string().trim().max(64).optional(),
  company: z.string().trim().max(255).optional(),
});

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "USER", "TRIAL_USER"] as const;
const VALID_STATUSES = ["ACTIVE", "SUSPENDED", "EXPIRED", "PENDING_VERIFICATION"] as const;

/** Clamp a page-size/duration query param into a sane, non-negative range. */
function clampInt(value: string | null, fallback: number, max: number): number {
  const parsed = parseInt(value || String(fallback), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), max);
}

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
    const limit = clampInt(searchParams.get("limit"), 50, 200) || 50;
    const offset = clampInt(searchParams.get("offset"), 0, 1_000_000);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const where: any = {};
    // Enum filters are validated so an unbounded Prisma enum error can never
    // surface as a 500.
    if (role && (VALID_ROLES as readonly string[]).includes(role)) where.role = role as any;
    if (status && (VALID_STATUSES as readonly string[]).includes(status))
      where.status = status as any;

    const users = await prisma.user.findMany({
      where,
      include: {
        subscription: {
          include: { plan: true },
        },
        settings: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { id, role, status, name, email, phone, company } = result.data;

    // Privilege escalation guard: the caller's own role determines which
    // roles they may assign. Without this, a plain ADMIN could mint
    // SUPER_ADMIN accounts. Only a SUPER_ADMIN can create another SUPER_ADMIN.
    if (role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only a super-admin can assign the super-admin role." },
        { status: 403 }
      );
    }

    // Privilege guards: an ADMIN (non-super) can never modify a SUPER_ADMIN
    // account, and nobody can change their own role/status from this endpoint.
    if (user.role !== "SUPER_ADMIN") {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Super-admin accounts can only be modified by another super-admin." },
          { status: 403 }
        );
      }
    }
    if (user.id === id && (role || status)) {
      return NextResponse.json(
        { error: "You cannot change your own role or status." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        phone: phone || null,
        company: company || null,
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_USER",
        entity: "User",
        entityId: id,
        details: JSON.stringify({ role, status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (user.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Only a SUPER_ADMIN may delete a SUPER_ADMIN account.
    if (user.role !== "SUPER_ADMIN") {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Super-admin accounts can only be deleted by another super-admin." },
          { status: 403 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_USER",
        entity: "User",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
