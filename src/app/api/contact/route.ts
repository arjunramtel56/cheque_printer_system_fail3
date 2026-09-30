export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, clientIp } from "@/lib/rate-limit";

/**
 * Contact form endpoint.
 *
 * Persists every submission as a SupportTicket so the team sees it in the
 * admin area even before any email-delivery infrastructure exists. When an
 * email provider is added, hook notification sends into the same place the
 * ticket is created — the user-facing behaviour stays identical.
 *
 * Validation is server-side (the client-side checks are UX only), with
 * rate limiting for spam/abuse protection. Errors are generic by design;
 * full details go to the server log.
 */

const NAME_MIN = 2;
const SUBJECT_MIN = 3;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

export async function POST(request: NextRequest) {
  // Spam/abuse protection: max 5 submissions per IP per hour.
  if (isRateLimited(`contact:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    // Server-side validation — the client can never be trusted.
    if (name.length < NAME_MIN) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (subject.length < SUBJECT_MIN) {
      return NextResponse.json({ error: "Please enter a subject." }, { status: 400 });
    }
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Your message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.` },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        name,
        email,
        subject,
        message,
        ipAddress: clientIp(request),
        status: "OPEN",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CONTACT_MESSAGE_RECEIVED",
        entity: "SupportTicket",
        entityId: ticket.id,
        ipAddress: clientIp(request),
      },
    });

    return NextResponse.json(
      {
        message:
          "Your message has been sent successfully. Our team will review your inquiry and contact you if a response is required.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CONTACT_FORM_ERROR]", error);
    return NextResponse.json(
      {
        error: "Unable to send your message right now. Please try again later or call us directly.",
      },
      { status: 500 }
    );
  }
}
