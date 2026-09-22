"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function registerUser(prevState: any, formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validated = registerSchema.safeParse(rawData);

    if (!validated.success) {
      return { error: validated.error.errors[0].message };
    }

    const { fullName, email, company, phone, password } = validated.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Email already registered." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    return { success: true };
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return { error: "Internal server error. Please check server logs." };
  }
}
