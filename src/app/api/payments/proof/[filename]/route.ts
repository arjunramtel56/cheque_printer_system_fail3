export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { readFileSync, existsSync } from "fs";
import { join, basename } from "path";

/**
 * Authenticated payment-proof serving.
 *
 * Proof files live outside public/, so this is the only way to view them.
 * Access rules:
 *   - the payment owner can view their own proof
 *   - ADMIN / SUPER_ADMIN can view any proof
 * Everyone else gets 403. Files are streamed with no-store caching.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // Only allow our own generated names: pay_<uuid>.<ext>
  if (!/^pay_[a-zA-Z0-9-]+\.(png|jpg|jpeg|gif|webp)$/.test(filename)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { proofUrl: { endsWith: filename } },
    select: { id: true, userId: true, proofUrl: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = token.role as string | undefined;
  const isPrivileged = role === "ADMIN" || role === "SUPER_ADMIN";
  if (payment.userId !== token.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Defense in depth: strip any path segments before reading.
  const safeName = basename(filename);
  const filepath = join(process.cwd(), ".data", "payment-proofs", safeName);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = safeName.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "gif"
        ? "image/gif"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  const data = readFileSync(filepath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, no-store",
    },
  });
}
