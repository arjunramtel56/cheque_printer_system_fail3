export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bootstrapSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  bootstrapSecret: z.string().min(1, "Bootstrap secret is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bootstrapSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, bootstrapSecret } = result.data;

    const adminBootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    if (!adminBootstrapSecret || adminBootstrapSecret === "change-this-admin-bootstrap-secret") {
      return NextResponse.json(
        { error: "Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_SECRET in environment." },
        { status: 503 }
      );
    }

    if (bootstrapSecret !== adminBootstrapSecret) {
      return NextResponse.json({ error: "Invalid bootstrap secret." }, { status: 403 });
    }

    // Check if a SUPER_ADMIN already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingAdmin) {
      // Allow updating/upserting the admin if bootstrap secret is correct
      // This enables secure admin password reset
      const passwordHash = await bcrypt.hash(password, 12);

      const updated = await prisma.user.update({
        where: { email: existingAdmin.email },
        data: {
          name,
          email,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: updated.id,
          action: "ADMIN_BOOTSTRAPPED",
          entity: "User",
          entityId: updated.id,
          details: JSON.stringify({ email: updated.email, name: updated.name }),
        },
      });

      return NextResponse.json(
        { message: "Admin account updated successfully.", userId: updated.id },
        { status: 200 }
      );
    }

    // Check if the email is already used by a non-admin
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use. Use a different email for the admin account." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        settings: {
          create: {},
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_BOOTSTRAPPED",
        entity: "User",
        entityId: user.id,
        details: JSON.stringify({ email: user.email, name: user.name }),
      },
    });

    return NextResponse.json(
      { message: "Admin account created successfully.", userId: user.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[ADMIN_BOOTSTRAP_ERROR]", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
