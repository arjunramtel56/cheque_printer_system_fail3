import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

const VALID_PAYMENT_STATUSES = ["PENDING_VERIFICATION", "APPROVED", "REJECTED"];
const VALID_PAYMENT_METHODS = ["FONEPAY", "BANK_TRANSFER", "CASH", "OTHER"];

function validatePaymentInput(body: any): { valid: boolean; error?: string } {
  if (!body.plan) {
    return { valid: false, error: "Plan is required" };
  }

  const duration = parseInt(body.duration || "1");
  if (isNaN(duration) || duration < 1 || duration > 12) {
    return { valid: false, error: "Invalid duration" };
  }

  const amount = body.amount ? parseFloat(body.amount) : undefined;
  if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
    return { valid: false, error: "Invalid amount" };
  }

  const method = body.paymentMethod || "FONEPAY";
  if (!VALID_PAYMENT_METHODS.includes(method)) {
    return { valid: false, error: "Invalid payment method" };
  }

  if (!body.reference || !body.reference.trim()) {
    return { valid: false, error: "Transaction reference is required" };
  }

  return { valid: true };
}

function validateAdminUpdate(body: any): { valid: boolean; error?: string } {
  if (!body.id) {
    return { valid: false, error: "Payment ID is required" };
  }

  if (!body.status || !VALID_PAYMENT_STATUSES.includes(body.status)) {
    return { valid: false, error: "Invalid status. Must be APPROVED or REJECTED" };
  }

  if (body.status === "REJECTED" && !body.rejectionReason?.trim()) {
    return { valid: false, error: "Rejection reason is required for rejected payments" };
  }

  return { valid: true };
}

function isOwnPayment(paymentUserId: string, adminUserId: string): boolean {
  return paymentUserId === adminUserId;
}

function canTransition(oldStatus: string, newStatus: string): boolean {
  if (oldStatus === newStatus) return false;
  if (oldStatus === "PENDING_VERIFICATION")
    return newStatus === "APPROVED" || newStatus === "REJECTED";
  return false;
}

function computeSubscriptionDates(durationMonths: number, from = new Date()) {
  const startDate = new Date(from);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return { startDate, endDate };
}

describe("Payment validation logic", () => {
  describe("validatePaymentInput", () => {
    it("accepts a valid FONEPAY payment", () => {
      const result = validatePaymentInput({
        plan: "standard",
        duration: "3",
        amount: "99",
        currency: "NPR",
        paymentMethod: "FONEPAY",
        reference: "TXN-12345",
      });
      assert.equal(result.valid, true);
    });

    it("rejects missing plan", () => {
      const result = validatePaymentInput({ duration: "1" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Plan is required");
    });

    it("rejects duration less than 1", () => {
      const result = validatePaymentInput({ plan: "standard", duration: 0 });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid duration");
    });

    it("rejects duration greater than 12", () => {
      const result = validatePaymentInput({ plan: "standard", duration: 13 });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid duration");
    });

    it("rejects negative amount", () => {
      const result = validatePaymentInput({ plan: "standard", amount: "-5" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid amount");
    });

    it("rejects zero amount", () => {
      const result = validatePaymentInput({ plan: "standard", amount: "0" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid amount");
    });

    it("rejects invalid payment method", () => {
      const result = validatePaymentInput({
        plan: "standard",
        paymentMethod: "BITCOIN",
      });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid payment method");
    });

    it("accepts all valid payment methods", () => {
      for (const method of VALID_PAYMENT_METHODS) {
        const result = validatePaymentInput({
          plan: "standard",
          paymentMethod: method,
          reference: "TXN-1",
        });
        assert.equal(result.valid, true, `Method ${method} should be valid`);
      }
    });

    it("rejects empty reference", () => {
      const result = validatePaymentInput({ plan: "standard", reference: "" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Transaction reference is required");
    });

    it("defaults to FONEPAY when no method given", () => {
      const result = validatePaymentInput({ plan: "standard", reference: "TXN-1" });
      assert.equal(result.valid, true);
    });
  });

  describe("validateAdminUpdate", () => {
    it("accepts a valid APPROVED update", () => {
      const result = validateAdminUpdate({ id: "pay_123", status: "APPROVED" });
      assert.equal(result.valid, true);
    });

    it("accepts a valid REJECTED update with reason", () => {
      const result = validateAdminUpdate({
        id: "pay_123",
        status: "REJECTED",
        rejectionReason: "Proof unclear",
      });
      assert.equal(result.valid, true);
    });

    it("rejects missing id", () => {
      const result = validateAdminUpdate({ status: "APPROVED" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Payment ID is required");
    });

    it("rejects invalid status", () => {
      const result = validateAdminUpdate({ id: "pay_123", status: "PENDING_VERIFICATION" });
      assert.equal(result.valid, false);
    });

    it("rejects REJECTED without reason", () => {
      const result = validateAdminUpdate({ id: "pay_123", status: "REJECTED" });
      assert.equal(result.valid, false);
      assert.equal(result.error, "Rejection reason is required for rejected payments");
    });

    it("rejects empty rejection reason", () => {
      const result = validateAdminUpdate({
        id: "pay_123",
        status: "REJECTED",
        rejectionReason: "   ",
      });
      assert.equal(result.valid, false);
    });
  });

  describe("isOwnPayment security check", () => {
    it("detects admin reviewing own payment", () => {
      assert.equal(isOwnPayment("user123", "user123"), true);
    });

    it("allows admin to review other users' payments", () => {
      assert.equal(isOwnPayment("user456", "admin999"), false);
    });
  });

  describe("canTransition - duplicate approval prevention", () => {
    it("allows PENDING_VERIFICATION -> APPROVED", () => {
      assert.equal(canTransition("PENDING_VERIFICATION", "APPROVED"), true);
    });

    it("allows PENDING_VERIFICATION -> REJECTED", () => {
      assert.equal(canTransition("PENDING_VERIFICATION", "REJECTED"), true);
    });

    it("prevents APPROVED -> APPROVED (duplicate approval)", () => {
      assert.equal(canTransition("APPROVED", "APPROVED"), false);
    });

    it("prevents APPROVED -> REJECTED", () => {
      assert.equal(canTransition("APPROVED", "REJECTED"), false);
    });

    it("prevents REJECTED -> APPROVED", () => {
      assert.equal(canTransition("REJECTED", "APPROVED"), false);
    });

    it("prevents REJECTED -> REJECTED", () => {
      assert.equal(canTransition("REJECTED", "REJECTED"), false);
    });

    it("prevents identical transition", () => {
      assert.equal(canTransition("PENDING_VERIFICATION", "PENDING_VERIFICATION"), false);
    });
  });

  describe("computeSubscriptionDates", () => {
    it("correctly computes 1-month subscription end date", () => {
      const start = new Date("2024-01-15T10:00:00Z");
      const { startDate, endDate } = computeSubscriptionDates(1, start);
      assert.equal(startDate.toISOString(), "2024-01-15T10:00:00.000Z");
      assert.equal(endDate.toISOString(), "2024-02-15T10:00:00.000Z");
    });

    it("correctly computes 3-month subscription end date", () => {
      const start = new Date("2024-01-15T10:00:00Z");
      const { endDate } = computeSubscriptionDates(3, start);
      assert.equal(endDate.toISOString(), "2024-04-15T10:00:00.000Z");
    });

    it("correctly computes 12-month subscription end date", () => {
      const start = new Date("2024-01-15T10:00:00Z");
      const { endDate } = computeSubscriptionDates(12, start);
      assert.equal(endDate.toISOString(), "2025-01-15T10:00:00.000Z");
    });

    it("defaults to current date when no start provided", () => {
      const before = Date.now();
      const { startDate } = computeSubscriptionDates(1);
      const after = Date.now();
      assert.ok(startDate.getTime() >= before);
      assert.ok(startDate.getTime() <= after);
    });
  });
});
