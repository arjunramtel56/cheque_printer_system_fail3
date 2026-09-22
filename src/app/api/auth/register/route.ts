export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

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
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error. Please check server logs." },
      { status: 500 }
    );
  }
}
