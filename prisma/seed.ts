// =============================================================================
// Database seed script for the Reactify Cheque Printer System.
//
// STATUS: placeholder — seeds the Prisma database from the same bank/template
// data that the client-side build uses (src/data/banks.ts, src/data/templates.ts).
// This ensures the database and the in-memory catalogue never drift apart.
//
// Usage (once prisma is installed and DATABASE_URL is set):
//   npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { BANK_LIST } from "../src/data/banks";
import { TEMPLATE_SEEDS, MICR_BAND_MM } from "../src/data/templates";
import { CHEQUE_SIZES, PAPER_SIZES } from "../src/lib/sizes";

const prisma = new PrismaClient();

async function main() {
  // Seed cheque sizes
  for (const size of CHEQUE_SIZES) {
    await prisma.chequeSize.upsert({
      where: { id: size.id },
      update: {
        label: size.label,
        widthMm: size.widthMm,
        heightMm: size.heightMm,
        builtin: size.builtin ?? false,
      },
      create: {
        id: size.id,
        label: size.label,
        widthMm: size.widthMm,
        heightMm: size.heightMm,
        builtin: size.builtin ?? false,
      },
    });
  }

  // Seed paper sizes
  for (const paper of PAPER_SIZES) {
    await prisma.paperSize.upsert({
      where: { id: paper.id },
      update: {
        label: paper.label,
        widthMm: paper.widthMm,
        heightMm: paper.heightMm,
        orientation: paper.orientation,
      },
      create: {
        id: paper.id,
        label: paper.label,
        widthMm: paper.widthMm,
        heightMm: paper.heightMm,
        orientation: paper.orientation,
      },
    });
  }

  // Seed banks
  for (const bank of BANK_LIST) {
    await prisma.bank.upsert({
      where: { id: bank.id },
      update: {
        name: bank.name,
        nrbClass: bank.nrbClass as any,
        code: bank.code,
        status: bank.status as any,
        enabled: bank.enabled,
        supersededBy: bank.supersededBy,
        verifiedAt: bank.verifiedAt ? new Date(bank.verifiedAt) : null,
      },
      create: {
        id: bank.id,
        name: bank.name,
        nrbClass: bank.nrbClass as any,
        code: bank.code,
        status: bank.status as any,
        enabled: bank.enabled,
        supersededBy: bank.supersededBy,
        verifiedAt: bank.verifiedAt ? new Date(bank.verifiedAt) : null,
      },
    });
  }

  // Seed cheque templates
  for (const tmpl of TEMPLATE_SEEDS) {
    await prisma.chequeTemplate.upsert({
      where: { id: tmpl.id },
      update: {
        bankId: tmpl.bankId,
        label: tmpl.label,
        sizeId: tmpl.sizeId,
        widthMm: tmpl.widthMm,
        heightMm: tmpl.heightMm,
        orientation: tmpl.orientation as any,
        fields: tmpl.fields as any,
        structural: tmpl.structural as any,
        safeZones: tmpl.safeZones as any,
        profiles: tmpl.profiles as any,
        printX: tmpl.print?.calibration?.defaultX ?? 0,
        printY: tmpl.print?.calibration?.defaultY ?? 0,
        supportedModes: tmpl.print?.supportedModes ?? [],
        verificationStatus: tmpl.verification.status as any,
        verifiedAt: tmpl.verification.verifiedAt ? new Date(tmpl.verification.verifiedAt) : null,
        note: tmpl.verification.note,
        enabled: tmpl.enabled,
      },
      create: {
        id: tmpl.id,
        bankId: tmpl.bankId,
        label: tmpl.label,
        sizeId: tmpl.sizeId,
        widthMm: tmpl.widthMm,
        heightMm: tmpl.heightMm,
        orientation: tmpl.orientation as any,
        fields: tmpl.fields as any,
        structural: tmpl.structural as any,
        safeZones: tmpl.safeZones ?? [MICR_BAND_MM] as any,
        profiles: tmpl.profiles as any,
        printX: tmpl.print?.calibration?.defaultX ?? 0,
        printY: tmpl.print?.calibration?.defaultY ?? 0,
        supportedModes: tmpl.print?.supportedModes ?? [],
        verificationStatus: tmpl.verification.status as any,
        verifiedAt: tmpl.verification.verifiedAt ? new Date(tmpl.verification.verifiedAt) : null,
        note: tmpl.verification.note,
        enabled: tmpl.enabled,
      },
    });
  }

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
