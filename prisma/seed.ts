import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create plans
  const trialPlan = await prisma.plan.upsert({
    where: { name: "trial" },
    update: {},
    create: {
      name: "trial",
      description: "14-day free trial with 10 cheque prints",
      price: 0,
      durationDays: 14,
      chequeLimit: 10,
      features: JSON.stringify({ templates: "basic", export: false, bulkPrint: false }),
    },
  });

  const standardPlan = await prisma.plan.upsert({
    where: { name: "standard" },
    update: {},
    create: {
      name: "standard",
      description: "Standard plan with 100 prints per month",
      price: 500,
      durationDays: 30,
      chequeLimit: 100,
      features: JSON.stringify({ templates: "all", export: true, bulkPrint: false }),
    },
  });

  const businessPlan = await prisma.plan.upsert({
    where: { name: "business" },
    update: {},
    create: {
      name: "business",
      description: "Business plan with unlimited prints",
      price: 1500,
      durationDays: 30,
      chequeLimit: -1, // unlimited
      features: JSON.stringify({ templates: "all", export: true, bulkPrint: true }),
    },
  });

  console.log("Plans created:", { trialPlan, standardPlan, businessPlan });

  // Create default banks
  const banks = [
    { name: "Nabil Bank Limited", code: "NABIL" },
    { name: "Nepal Investment Bank Limited", code: "NIBL" },
    { name: "Global IME Bank Limited", code: "GIBL" },
    { name: "Prabhu Bank Limited", code: "PRABHU" },
    { name: "NIC Asia Bank Limited", code: "NIC" },
    { name: "Rastriya Banijya Bank Limited", code: "RBB" },
    { name: "Nepal Bank Limited", code: "NBL" },
    { name: "Himalayan Bank Limited", code: "HBL" },
    { name: "Sanima Bank Limited", code: "SANIMA" },
    { name: "Siddhartha Bank Limited", code: "SBL" },
  ];

  for (const bank of banks) {
    const created = await prisma.bank.upsert({
      where: { code: bank.code },
      update: {},
      create: bank,
    });

    // Create a default template for each bank
    await prisma.bankTemplate.upsert({
      where: { bankId_name: { bankId: created.id, name: "Standard Cheque" } },
      update: {},
      create: {
        bankId: created.id,
        name: "Standard Cheque",
        chequeWidth: 210,
        chequeHeight: 90,
        isDefault: true,
        fields: {
          create: [
            {
              field: "name",
              x: 25,
              y: 15,
              fontSize: 11,
              fontFamily: "Arial",
              fontWeight: "normal",
            },
            {
              field: "date",
              x: 140,
              y: 10,
              fontSize: 10,
              fontFamily: "Arial",
              fontWeight: "normal",
            },
            {
              field: "amountWords",
              x: 25,
              y: 40,
              width: 150,
              fontSize: 10,
              fontFamily: "Arial",
              fontWeight: "normal",
            },
            {
              field: "amountNumber",
              x: 145,
              y: 55,
              fontSize: 12,
              fontFamily: "Arial",
              fontWeight: "bold",
            },
          ],
        },
      },
    });
  }

  console.log("Banks and templates created");

  // System settings are now managed via admin panel
  // Admin account is bootstrapped via /api/admin/bootstrap endpoint using ADMIN_BOOTSTRAP_SECRET

  const settings = [
    { key: "app.name", value: "Reactify Cheque Printer System", description: "Application name" },
    {
      key: "app.company",
      value: "Reactify Software Technologies Pvt. Ltd.",
      description: "Company name",
    },
    { key: "trial.durationDays", value: 14, description: "Default trial duration in days" },
    { key: "trial.chequeLimit", value: 10, description: "Default trial cheque limit" },
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("System settings created");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
