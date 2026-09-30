export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/api-helpers";

/**
 * Own-profile update endpoint. Only the fields below are editable — email and
 * role are intentionally excluded (email is the login identifier; role changes
 * belong to the admin API). Password changes are NOT handled here.
 */

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    const body = await request.json();
    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.name,
        company: parsed.company || null,
        phone: parsed.phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: true,
        phone: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_PROFILE",
        entity: "User",
        entityId: user.id,
        details: JSON.stringify({ fields: ["name", "company", "phone"] }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Could not update your profile. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[PROFILE_FETCH_ERROR]", error);
    return NextResponse.json(
      { error: "Could not load your profile. Please try again." },
      { status: 500 }
    );
  }
}
