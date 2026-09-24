"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations";

export async function registerUser(prevState: any, formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validated = registerSchema.safeParse(rawData);

    if (!validated.success) {
      return { error: validated.error.errors[0].message };
    }

    const { name: fullName, email, company, phone, password } = validated.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Email already registered. Try logging in." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const trialExpires = new Date();
    trialExpires.setDate(trialExpires.getDate() + 14);

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

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trialPlan.durationDays);

    await prisma.user.create({
      data: {
        name: fullName,
        email,
        passwordHash: hashedPassword,
        company: company || null,
        phone: phone || null,
        role: "TRIAL_USER",
        status: "ACTIVE",
        trialExpires,
        subscription: {
          create: {
            planId: trialPlan.id,
            startDate: new Date(),
            endDate,
            isActive: true,
          },
        },
        settings: {
          create: {},
        },
      },
    });

    return { success: true, message: "Account created! Please log in." };
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error);
    if (error.code === "P2002") {
      return { error: "Email already registered. Try logging in." };
    }
    return { error: "An unexpected error occurred. Please try again." };
  }
}
