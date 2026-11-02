export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { sniffImage } from "@/lib/file-security";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, GIF, WebP allowed." },
        { status: 400 }
      );
    }

    // Content sniffing: the claimed Content-Type is client-controlled, so the
    // data's own magic numbers must agree with it before anything is written.
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImage(buffer);

    if (!sniffed) {
      return NextResponse.json({ error: "File content is not a valid image." }, { status: 400 });
    }

    if (!allowedTypes.includes(sniffed.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, GIF, WebP allowed." },
        { status: 400 }
      );
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "templates");
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Extension comes from the sniffed real type (constant allowlist), never
    // from the client-supplied mimetype string — a mismatched claim cannot
    // shape the filename.
    const filename = `tmpl_${randomUUID()}.${sniffed.ext}`;
    const filepath = join(uploadDir, filename);

    writeFileSync(filepath, buffer);

    const url = `/uploads/templates/${filename}`;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPLOAD_TEMPLATE_IMAGE",
        entity: "Upload",
        entityId: filename,
        details: JSON.stringify({ originalName: file.name, size: file.size, type: file.type }),
      },
    });

    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
