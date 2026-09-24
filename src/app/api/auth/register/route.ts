export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Normalize: accept either name or fullName from the client
    const normalized = {
      name: body.name || body.fullName || "",
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword || body.password,
      company: body.company,
      phone: body.phone,
    };

    const result = registerSchema.safeParse(normalized);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, company, phone } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Find or create trial plan
    let trialPlan = await prisma.plan.findUnique({ where: { name: "trial" } });
    if (!trialPlan) {
      trialPlan = await prisma.plan.create({
        data: {
          name: "trial",
          description: "14-day free trial with 10 cheque prints",
          price: 0,
          durationDays: 14,
          chequeLimit: 10,
          features: JSON.stringify({ templates: "basic", export: false, bulkPrint: false }),
        },
      });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + trialPlan.durationDays * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        company: company || null,
        phone: phone || null,
        role: "TRIAL_USER",
        status: "ACTIVE",
        trialExpires: endDate,
        subscription: {
          create: {
            planId: trialPlan.id,
            startDate: now,
            endDate: endDate,
            isActive: true,
          },
        },
        settings: {
          create: {},
        },
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
