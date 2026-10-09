import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAccess, isAccountBlocked, isTrialExpired } from "../trial";

/**
 * Regression guard for claims that used to be frozen at sign-in.
 *
 * Auth.js seals role/status/trial state into the session cookie and only
 * re-runs the `jwt` callback on sign-in, so a boolean such as `trialExpired`
 * kept reporting whatever was true at login for the whole (30-day) session.
 * These decisions therefore work from a timestamp compared against the clock at
 * request time, which is what makes an expiry that happens *during* a session
 * take effect on the next request.
 */

const TRIAL_END = "2026-10-09T12:00:00.000Z";
const BEFORE = new Date("2026-10-09T11:59:59.000Z");
const AFTER = new Date("2026-10-09T12:00:01.000Z");

describe("isTrialExpired", () => {
  it("is false while the trial is still running", () => {
    assert.equal(isTrialExpired({ role: "TRIAL_USER", trialExpiresAt: TRIAL_END }, BEFORE), false);
  });

  it("is true once the trial end passes — no sign-in required", () => {
    assert.equal(
      isTrialExpired({ role: "TRIAL_USER", trialExpiresAt: TRIAL_END }, AFTER),
      true,
      "an expiry during an open session must be enforced on the next request"
    );
  });

  it("changes its answer as time moves, unlike a claim frozen at sign-in", () => {
    const claims = { role: "TRIAL_USER", trialExpiresAt: TRIAL_END };

    assert.equal(isTrialExpired(claims, BEFORE), false);
    assert.equal(isTrialExpired(claims, AFTER), true);
  });

  it("treats the exact expiry instant as expired", () => {
    assert.equal(
      isTrialExpired({ role: "TRIAL_USER", trialExpiresAt: TRIAL_END }, new Date(TRIAL_END)),
      true
    );
  });

  it("accepts a Date as well as an ISO string", () => {
    assert.equal(
      isTrialExpired({ role: "TRIAL_USER", trialExpiresAt: new Date(TRIAL_END) }, AFTER),
      true
    );
  });

  it("never expires a non-trial role, even with a stale trial clock", () => {
    for (const role of ["USER", "ADMIN", "SUPER_ADMIN"]) {
      assert.equal(
        isTrialExpired({ role, trialExpiresAt: TRIAL_END }, AFTER),
        false,
        `${role} must keep access: approving a payment cannot lock a customer out`
      );
    }
  });

  it("falls back to the legacy boolean for tokens minted before the timestamp existed", () => {
    assert.equal(
      isTrialExpired({ role: "TRIAL_USER", legacyTrialExpired: true }, AFTER),
      true,
      "live sessions must survive the upgrade to timestamp-based claims"
    );
    assert.equal(isTrialExpired({ role: "TRIAL_USER", legacyTrialExpired: false }, AFTER), false);
  });

  it("treats a missing trial clock as 'not expired'", () => {
    assert.equal(isTrialExpired({ role: "TRIAL_USER", trialExpiresAt: null }, AFTER), false);
  });

  it("falls back to the legacy claim when the timestamp is unparseable", () => {
    assert.equal(
      isTrialExpired({
        role: "TRIAL_USER",
        trialExpiresAt: "not-a-date",
        legacyTrialExpired: true,
      }),
      true
    );
    assert.equal(
      isTrialExpired({
        role: "TRIAL_USER",
        trialExpiresAt: "not-a-date",
        legacyTrialExpired: false,
      }),
      false
    );
  });
});

describe("isAccountBlocked", () => {
  it("names the denial so the login page can explain it", () => {
    assert.equal(isAccountBlocked("SUSPENDED"), "suspended");
    assert.equal(isAccountBlocked("EXPIRED"), "expired");
  });

  it("lets normal and unverified accounts through", () => {
    for (const status of ["ACTIVE", "PENDING_VERIFICATION", null, undefined]) {
      assert.equal(isAccountBlocked(status), null);
    }
  });
});

describe("evaluateAccess", () => {
  it("reports a suspended account and its trial state together", () => {
    assert.deepEqual(
      evaluateAccess({ role: "TRIAL_USER", status: "SUSPENDED", trialExpiresAt: TRIAL_END }, AFTER),
      { blocked: "suspended", trialExpired: true }
    );
  });

  it("reports nothing for a healthy paying user", () => {
    assert.deepEqual(
      evaluateAccess({ role: "USER", status: "ACTIVE", trialExpiresAt: TRIAL_END }, AFTER),
      { blocked: null, trialExpired: false }
    );
  });
});
