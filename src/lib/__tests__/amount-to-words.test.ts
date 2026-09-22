import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amountToWords, formatAmount } from "../amount-to-words";

describe("amountToWords — English", () => {
  it("converts zero", () => {
    assert.equal(amountToWords(0, "en"), "Zero Rupees Only");
  });

  it("converts the roadmap case 125000", () => {
    assert.equal(amountToWords(125000, "en"), "One Hundred Twenty Five Thousand Rupees Only");
  });

  it("converts thousands", () => {
    assert.equal(amountToWords(1000, "en"), "One Thousand Rupees Only");
  });

  it("converts hundred-thousands", () => {
    assert.equal(amountToWords(100000, "en"), "One Hundred Thousand Rupees Only");
  });

  it("converts crores as ten-millions", () => {
    assert.equal(amountToWords(10000000, "en"), "Ten Million Rupees Only");
  });

  it("converts hundreds with remainder", () => {
    assert.equal(amountToWords(101, "en"), "One Hundred One Rupees Only");
  });

  it("converts rupees with paise", () => {
    assert.equal(
      amountToWords("1234.56", "en"),
      "One Thousand Two Hundred Thirty Four Rupees and Fifty Six Paise Only"
    );
  });

  it("carries paise rounding into rupees", () => {
    assert.equal(amountToWords(19.999, "en"), "Twenty Rupees Only");
  });

  it("rejects negative amounts", () => {
    assert.equal(amountToWords(-5, "en"), "Invalid amount");
  });

  it("rejects non-numeric strings", () => {
    assert.equal(amountToWords("abc", "en"), "Invalid amount");
  });

  it("defaults to English", () => {
    assert.equal(amountToWords(500), "Five Hundred Rupees Only");
  });
});

describe("amountToWords — Nepali", () => {
  it("converts zero", () => {
    assert.equal(amountToWords(0, "ne"), "शून्य रुपैयाँ मात्र");
  });

  it("converts the roadmap case 125000", () => {
    assert.equal(amountToWords(125000, "ne"), "एक लाख पच्चीस हजार मात्र");
  });

  it("converts thousands with the thousands unit", () => {
    assert.equal(amountToWords(1000, "ne"), "एक हजार मात्र");
  });

  it("converts hundred-thousands as lakh", () => {
    assert.equal(amountToWords(100000, "ne"), "एक लाख मात्र");
  });

  it("converts one crore", () => {
    assert.equal(amountToWords(10000000, "ne"), "एक करोड मात्र");
  });

  it("uses compound numerals for 1-99", () => {
    assert.equal(amountToWords(19, "ne"), "उन्निस मात्र");
    assert.equal(amountToWords(25, "ne"), "पच्चीस मात्र");
    assert.equal(amountToWords(99, "ne"), "निरानब्बे मात्र");
  });

  it("converts hundreds with remainder", () => {
    assert.equal(amountToWords(101, "ne"), "एक सय एक मात्र");
  });

  it("converts mixed lakh / thousand / hundreds", () => {
    assert.equal(amountToWords(123456, "ne"), "एक लाख तेइस हजार चार सय छपन्न मात्र");
  });

  it("converts rupees with paise", () => {
    assert.equal(
      amountToWords("1250.50", "ne"),
      "एक हजार दुई सय पचास रुपैयाँ र पचास पैसा मात्र"
    );
  });

  it("carries paise rounding into rupees", () => {
    assert.equal(amountToWords(19.999, "ne"), "बीस मात्र");
  });

  it("accepts string amounts", () => {
    assert.equal(amountToWords("125000", "ne"), "एक लाख पच्चीस हजार मात्र");
  });

  it("rejects negative amounts", () => {
    assert.equal(amountToWords(-5, "ne"), "अमान्य रकम");
  });

  it("rejects non-numeric strings", () => {
    assert.equal(amountToWords("abc", "ne"), "अमान्य रकम");
  });

  it("output contains only Devanagari, spaces and punctuation", () => {
    const words = amountToWords(125000, "ne");
    assert.match(words, /^[\u0900-\u097F\s]+$/u);
  });
});

describe("formatAmount", () => {
  it("formats with two decimals", () => {
    assert.equal(formatAmount(1234.5), "1,234.50");
  });

  it("formats integer amounts", () => {
    assert.equal(formatAmount(500), "500.00");
  });

  it("falls back to 0.00 for invalid input", () => {
    assert.equal(formatAmount("abc"), "0.00");
  });
});
