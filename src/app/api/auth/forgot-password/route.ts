export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isRateLimited, clientIp } from "@/lib/rate-limit";
import { z } from "zod";
import bcrypt from "bcryptjs";

/**
 * Password reset flow.
 *
 * This deployment has no email-delivery infrastructure, so the flow works
 * without it:
 *
 *   POST /api/auth/forgot-password
 *     { email } → creates a one-time, 60-minute token (SHA-256 hash stored;
 *     raw token exists only in the reset link). The response is identical
 *     whether or not the email exists — no account enumeration. In
 *     development the reset URL is also returned so the flow is testable;
 *     in production it never leaves the server log.
 *
 *   PUT /api/auth/forgot-password
 *     { token, password } → validates hash + expiry + single use, blocks
 *     reusing the current password, updates the hash, marks the token used
 *     (reuse impossible), and invalidates any other outstanding tokens.
 *
 * When an email provider is added later, only POST needs changing: send the
 * same reset URL instead of returning it in development.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  // Abuse protection: max 5 reset requests per IP per hour.
  if (isRateLimited(`forgot:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      // Deliberately generic — do not reveal what failed validation.
      return NextResponse.json({
        message: "If that email is registered, a password reset link has been generated.",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate previous outstanding tokens for this account.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

      const rawToken = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const resetUrl = `/reset-password?token=${rawToken}`;

      // Server-side diagnostic only. In production the link is NOT returned
      // to the client (no email infrastructure yet — see module comment).
      console.warn(`[PASSWORD_RESET] Reset link generated for user ${user.id}: ${resetUrl}`);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          entity: "User",
          entityId: user.id,
          ipAddress: clientIp(request),
        },
      });

      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ message: "Password reset link generated.", resetUrl });
      }
    }

    // Identical response for unknown emails — no enumeration.
    return NextResponse.json({
      message: "If that email is registered, a password reset link has been generated.",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Unable to process your request right now. Please try again later." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Abuse protection: max 10 attempts per IP per 10 minutes (blocks token
  // brute-forcing; tokens are 256-bit so this is belt-and-braces).
  if (isRateLimited(`reset:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const rawToken = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!rawToken || !password) {
      return NextResponse.json({ error: "Missing reset token or password." }, { status: 400 });
    }

    // Same password policy as registration.
    const passwordCheck = z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number");
    const check = passwordCheck.safeParse(password);
    if (!check.success) {
      return NextResponse.json({ error: check.error.issues[0].message }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account is suspended. Contact support for assistance." },
        { status: 403 }
      );
    }

    // Prevent resetting to the same password (requires re-authentication on
    // other devices anyway because JWTs stay valid — see report note).
    const sameAsOld = await bcrypt.compare(password, record.user.passwordHash);
    if (sameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Single use: mark consumed and burn any other outstanding tokens.
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      }),
      prisma.auditLog.create({
        data: {
          userId: record.userId,
          action: "PASSWORD_RESET_COMPLETED",
          entity: "User",
          entityId: record.userId,
          ipAddress: clientIp(request),
        },
      }),
    ]);

    return NextResponse.json({
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Unable to reset your password right now. Please try again later." },
      { status: 500 }
    );
  }
}
