-- ─────────────────────────────────────────────────────────────────────
-- Baseline migration: 0001_initial_schema
-- Generated from prisma/schema.prisma for reference / historical tracking.
-- This migration is NOT applied via `prisma migrate deploy` in CI or Vercel.
-- Production uses `prisma db push` (additive sync) — see MIGRATION_PLAN.md.
-- ─────────────────────────────────────────────────────────────────────

-- ─── Enums ────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'TRIAL_USER');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING_VERIFICATION');
CREATE TYPE "ChequeStatus" AS ENUM ('DRAFT', 'READY', 'PRINTED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');
CREATE TYPE "PaymentMethod" AS ENUM ('FONEPAY', 'BANK_TRANSFER', 'CASH', 'OTHER');

-- ─── Tables ───────────────────────────────────────────────────────────

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" TIMESTAMP WITH TIME ZONE,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TRIAL_USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "company" TEXT,
    "trialExpires" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "Session_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "chequeLimit" INTEGER NOT NULL DEFAULT 50,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL UNIQUE,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Subscription_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Subscription_plan_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'FONEPAY',
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "proofUrl" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "Payment_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Payment_plan_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id"),
    CONSTRAINT "Payment_reviewer_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE TABLE "Bank" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE "BankTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "bankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chequeWidth" DOUBLE PRECISION NOT NULL DEFAULT 190.5,
    "chequeHeight" DOUBLE PRECISION NOT NULL DEFAULT 88.9,
    "backgroundUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "BankTemplate_bank_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE CASCADE
);

CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "templateId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "fontSize" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "fontFamily" TEXT NOT NULL DEFAULT 'Arial',
    "fontWeight" TEXT NOT NULL DEFAULT 'normal',
    "letterSpacing" DOUBLE PRECISION,
    "lineHeight" DOUBLE PRECISION,
    "align" TEXT NOT NULL DEFAULT 'left',
    "rotation" DOUBLE PRECISION,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "format" TEXT,
    CONSTRAINT "TemplateField_bankTemplate_fkey" FOREIGN KEY ("templateId") REFERENCES "BankTemplate" ("id") ON DELETE CASCADE
);

CREATE TABLE "ChequeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "payeeName" TEXT,
    "chequeNumber" TEXT,
    "chequeDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "amountNumber" DECIMAL(12,2) NOT NULL,
    "amountWords" TEXT NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "lastPrintedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "ChequeEntry_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "ChequeEntry_template_fkey" FOREIGN KEY ("templateId") REFERENCES "BankTemplate" ("id")
);

CREATE TABLE "Payee" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "bankAccount" TEXT,
    "chequeLimit" DECIMAL(12,2),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "Payee_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE TABLE "PrintHistory" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL,
    "chequeId" TEXT NOT NULL,
    "printedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "printerName" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    CONSTRAINT "PrintHistory_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "PrintHistory_cheque_fkey" FOREIGN KEY ("chequeId") REFERENCES "ChequeEntry" ("id") ON DELETE CASCADE
);

CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT NOT NULL UNIQUE,
    "defaultBankId" TEXT,
    "defaultTemplateId" TEXT,
    "defaultAccountName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "printerName" TEXT,
    CONSTRAINT "UserSettings_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "UserSettings_defaultBank_fkey" FOREIGN KEY ("defaultBankId") REFERENCES "Bank" ("id") ON DELETE SET NULL,
    CONSTRAINT "UserSettings_defaultTemplate_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "BankTemplate" ("id") ON DELETE SET NULL
);

CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "key" TEXT NOT NULL UNIQUE,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "AuditLog_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "tokenHash" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "usedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PasswordResetToken_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (cuid()),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_status_isActive_idx" ON "User"("status", "isActive");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Plan_name_idx" ON "Plan"("name");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_submittedAt_idx" ON "Payment"("submittedAt");
CREATE INDEX "Bank_code_idx" ON "Bank"("code");
CREATE INDEX "BankTemplate_bankId_idx" ON "BankTemplate"("bankId");
CREATE UNIQUE INDEX "BankTemplate_bankId_name_key" ON "BankTemplate"("bankId", "name");
CREATE INDEX "TemplateField_templateId_idx" ON "TemplateField"("templateId");
CREATE UNIQUE INDEX "TemplateField_templateId_field_key" ON "TemplateField"("templateId", "field");
CREATE INDEX "ChequeEntry_userId_idx" ON "ChequeEntry"("userId");
CREATE INDEX "ChequeEntry_templateId_idx" ON "ChequeEntry"("templateId");
CREATE INDEX "ChequeEntry_status_idx" ON "ChequeEntry"("status");
CREATE INDEX "ChequeEntry_chequeNumber_idx" ON "ChequeEntry"("chequeNumber");
CREATE UNIQUE INDEX "ChequeEntry_userId_chequeNumber_key" ON "ChequeEntry"("userId", "chequeNumber") WHERE "chequeNumber" IS NOT NULL;
CREATE INDEX "Payee_userId_idx" ON "Payee"("userId");
CREATE INDEX "Payee_name_idx" ON "Payee"("name");
CREATE INDEX "PrintHistory_userId_idx" ON "PrintHistory"("userId");
CREATE INDEX "PrintHistory_chequeId_idx" ON "PrintHistory"("chequeId");
CREATE INDEX "PrintHistory_printedAt_idx" ON "PrintHistory"("printedAt");
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicket_email_idx" ON "SupportTicket"("email");

-- ─── Triggers ─────────────────────────────────────────────────────────

-- Prisma auto-updates the `updatedAt` column via this trigger.
CREATE TRIGGER "User_updatedAt" BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "Plan_updatedAt" BEFORE UPDATE ON "Plan" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "Bank_updatedAt" BEFORE UPDATE ON "Bank" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "BankTemplate_updatedAt" BEFORE UPDATE ON "BankTemplate" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "ChequeEntry_updatedAt" BEFORE UPDATE ON "ChequeEntry" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "Payee_updatedAt" BEFORE UPDATE ON "Payee" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "UserSettings_updatedAt" BEFORE UPDATE ON "UserSettings" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
CREATE TRIGGER "SystemSettings_updatedAt" BEFORE UPDATE ON "SystemSettings" FOR EACH ROW EXECUTE FUNCTION prisma_updated_at();
