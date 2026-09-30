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

    const { name: fullName, company, phone, password } = validated.data;
    // Case-insensitive uniqueness: emails are stored lowercase.
    const email = validated.data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Email already registered. Try logging in." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let trialPlan = await prisma.plan.findUnique({ where: { name: "trial" } });
    if (!trialPlan) {
      trialPlan = await prisma.plan.create({
        data: {
          name: "trial",
          description: "24-hour free trial with 5 test prints",
          price: 0,
          durationDays: 1,
          chequeLimit: 5,
          features: JSON.stringify({ templates: "basic", export: false, bulkPrint: false }),
        },
      });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + trialPlan.durationDays * 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        name: fullName,
        email,
        passwordHash: hashedPassword,
        company: company || null,
        phone: phone || null,
        role: "TRIAL_USER",
        status: "ACTIVE",
        trialExpires: endDate,
        subscription: {
          create: {
            planId: trialPlan.id,
            startDate: now,
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
