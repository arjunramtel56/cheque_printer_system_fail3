import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  VALID_PAYMENT_STATUSES,
  VALID_PAYMENT_METHODS,
  canTransition,
  computeSubscriptionDates,
  isOwnPayment,
  validatePaymentAmount,
  createPaymentSchema,
  adminUpdatePaymentSchema,
} from "../validations";

describe("Payment module - workflow and security", () => {
  describe("VALID_PAYMENT_STATUSES", () => {
    it("contains PENDING_VERIFICATION, APPROVED, REJECTED", () => {
      assert.deepEqual(VALID_PAYMENT_STATUSES, ["PENDING_VERIFICATION", "APPROVED", "REJECTED"]);
    });
  });

  describe("VALID_PAYMENT_METHODS", () => {
    it("includes FONEPAY", () => {
      assert.ok(VALID_PAYMENT_METHODS.includes("FONEPAY"));
    });
  });

  describe("createPaymentSchema (zod)", () => {
    it("accepts a valid payment input", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        duration: 1,
        amount: 500,
        paymentMethod: "FONEPAY",
        reference: "TXN-12345",
        notes: "Some notes",
      });
      assert.equal(result.success, true);
    });

    it("defaults paymentMethod to FONEPAY when not provided", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        reference: "TXN-1",
      });
      assert.equal(result.success, true);
      assert.equal(result.data.paymentMethod, "FONEPAY");
    });

    it("defaults duration to undefined (uses default 1)", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        reference: "TXN-1",
      });
      assert.equal(result.success, true);
    });

    it("rejects missing plan", () => {
      const result = createPaymentSchema.safeParse({ reference: "TXN-1" });
      assert.equal(result.success, false);
    });

    it("rejects empty reference", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        reference: "  ",
      });
      assert.equal(result.success, false);
    });

    it("rejects reference longer than 200 chars", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        reference: "X".repeat(201),
      });
      assert.equal(result.success, false);
    });

    it("rejects invalid payment method", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        paymentMethod: "BITCOIN",
        reference: "TXN-1",
      });
      assert.equal(result.success, false);
    });

    it("rejects negative amount", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        amount: -5,
        reference: "TXN-1",
      });
      assert.equal(result.success, false);
    });

    it("rejects zero amount", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        amount: 0,
        reference: "TXN-1",
      });
      assert.equal(result.success, false);
    });

    it("rejects duration of 0", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        duration: 0,
        reference: "TXN-1",
      });
      assert.equal(result.success, false);
    });

    it("rejects duration of 13", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        duration: 13,
        reference: "TXN-1",
      });
      assert.equal(result.success, false);
    });

    it("accepts duration of 12", () => {
      const result = createPaymentSchema.safeParse({
        plan: "standard",
        duration: 12,
        reference: "TXN-1",
      });
      assert.equal(result.success, true);
    });
  });

  describe("adminUpdatePaymentSchema (zod)", () => {
    it("accepts APPROVED status", () => {
      const result = adminUpdatePaymentSchema.safeParse({ id: "pay_1", status: "APPROVED" });
      assert.equal(result.success, true);
    });

    it("accepts REJECTED with reason", () => {
      const result = adminUpdatePaymentSchema.safeParse({
        id: "pay_1",
        status: "REJECTED",
        rejectionReason: "Proof unclear",
      });
      assert.equal(result.success, true);
    });

    it("rejects missing id", () => {
      const result = adminUpdatePaymentSchema.safeParse({ status: "APPROVED" });
      assert.equal(result.success, false);
    });

    it("rejects PENDING_VERIFICATION as update status", () => {
      const result = adminUpdatePaymentSchema.safeParse({
        id: "pay_1",
        status: "PENDING_VERIFICATION",
      });
      assert.equal(result.success, false);
    });
  });

  describe("validatePaymentAmount", () => {
    it("returns true for amount matching plan price", () => {
      assert.equal(validatePaymentAmount(500, 500, 1), true);
    });

    it("returns true for amount matching plan price * duration", () => {
      assert.equal(validatePaymentAmount(1500, 500, 3), true);
    });

    it("returns false for mismatched amount", () => {
      assert.equal(validatePaymentAmount(99, 500, 1), false);
    });

    it("returns false for zero amount", () => {
      assert.equal(validatePaymentAmount(0, 500, 1), false);
    });

    it("returns false for negative amount", () => {
      assert.equal(validatePaymentAmount(-100, 500, 1), false);
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

    it("handles year-boundary crossings correctly", () => {
      const start = new Date("2024-11-15T10:00:00Z");
      const { endDate } = computeSubscriptionDates(3, start);
      assert.equal(endDate.toISOString(), "2025-02-15T10:00:00.000Z");
    });
  });
});
