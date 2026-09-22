import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amountToWords, formatAmount, formatDate } from "../amount-to-words";

describe("amountToWords — English", () => {
  it("converts zero", () => {
    assert.equal(amountToWords(0, "en"), "Zero Rupees Only");
  });

  it("converts the roadmap case 125000", () => {
    assert.equal(amountToWords(125000, "en"), "One Lakh Twenty Five Thousand Rupees Only");
  });

  it("converts the roadmap case 125000.50", () => {
    assert.equal(
      amountToWords(125000.5, "en"),
      "One Lakh Twenty Five Thousand Rupees and Fifty Paise Only"
    );
  });

  it("converts thousands", () => {
    assert.equal(amountToWords(1000, "en"), "One Thousand Rupees Only");
  });

  it("converts hundred-thousands as lakh", () => {
    assert.equal(amountToWords(100000, "en"), "One Lakh Rupees Only");
  });

  it("converts one crore (10 million)", () => {
    assert.equal(amountToWords(10000000, "en"), "One Crore Rupees Only");
  });

  it("converts 999999 (nine lakh ninety-nine thousand nine hundred ninety-nine)", () => {
    assert.equal(
      amountToWords(999999, "en"),
      "Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Rupees Only"
    );
  });

  it("converts 1500000 as fifteen lakh", () => {
    assert.equal(amountToWords(1500000, "en"), "Fifteen Lakh Rupees Only");
  });

  it("converts 50000000 as five crore", () => {
    assert.equal(amountToWords(50000000, "en"), "Five Crore Rupees Only");
  });

  it("converts hundreds with remainder", () => {
    assert.equal(amountToWords(101, "en"), "One Hundred One Rupees Only");
  });

  it("converts 99 (no hundred unit)", () => {
    assert.equal(amountToWords(99, "en"), "Ninety Nine Rupees Only");
  });

  it("converts 500", () => {
    assert.equal(amountToWords(500, "en"), "Five Hundred Rupees Only");
  });

  it("converts rupees with paise", () => {
    assert.equal(
      amountToWords("1234.56", "en"),
      "One Thousand Two Hundred Thirty Four Rupees and Fifty Six Paise Only"
    );
  });

  it("converts mixed lakh / thousand", () => {
    assert.equal(amountToWords(125000, "en"), "One Lakh Twenty Five Thousand Rupees Only");
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

  it("rejects NaN", () => {
    assert.equal(amountToWords(NaN, "en"), "Invalid amount");
  });

  it("defaults to English", () => {
    assert.equal(amountToWords(500), "Five Hundred Rupees Only");
  });

  it("accepts string amounts", () => {
    assert.equal(amountToWords("1000", "en"), "One Thousand Rupees Only");
  });

  it("converts 3525.75 with paise", () => {
    assert.equal(
      amountToWords(3525.75, "en"),
      "Three Thousand Five Hundred Twenty Five Rupees and Seventy Five Paise Only"
    );
  });

  it("converts 10 with single-digit paise", () => {
    assert.equal(amountToWords(10.05, "en"), "Ten Rupees and Five Paise Only");
  });

  it("converts 100 (roadmap edge case)", () => {
    assert.equal(amountToWords(100, "en"), "One Hundred Rupees Only");
  });

  it("converts 100000 — one lakh (roadmap edge case)", () => {
    assert.equal(amountToWords(100000, "en"), "One Lakh Rupees Only");
  });

  it("converts 10000000 — one crore (roadmap edge case)", () => {
    assert.equal(amountToWords(10000000, "en"), "One Crore Rupees Only");
  });

  it("converts 1250.50 with decimal (roadmap edge case)", () => {
    assert.equal(
      amountToWords(1250.5, "en"),
      "One Thousand Two Hundred Fifty Rupees and Fifty Paise Only"
    );
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
    assert.equal(amountToWords("1250.50", "ne"), "एक हजार दुई सय पचास रुपैयाँ र पचास पैसा मात्र");
  });

  it("converts 100 (roadmap edge case)", () => {
    assert.equal(amountToWords(100, "ne"), "एक सय मात्र");
  });

  it("converts 100000 — one lakh (roadmap edge case)", () => {
    assert.equal(amountToWords(100000, "ne"), "एक लाख मात्र");
  });

  it("converts 10000000 — one crore (roadmap edge case)", () => {
    assert.equal(amountToWords(10000000, "ne"), "एक करोड मात्र");
  });

  it("converts 1250.50 with decimal (roadmap edge case)", () => {
    assert.equal(
      amountToWords(1250.5, "ne"),
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

  it("formats large amounts with Indian grouping", () => {
    assert.equal(formatAmount(125000.5), "1,25,000.50");
  });

  it("formats one lakh with Indian grouping", () => {
    assert.equal(formatAmount(100000), "1,00,000.00");
  });

  it("falls back to 0.00 for invalid input", () => {
    assert.equal(formatAmount("abc"), "0.00");
  });

  it("falls back to 0.00 for NaN", () => {
    assert.equal(formatAmount(NaN), "0.00");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    assert.equal(formatDate("2024-01-15"), "15/01/2024");
  });

  it("formats a Date object", () => {
    assert.equal(formatDate(new Date("2024-12-25")), "25/12/2024");
  });

  it("returns empty string for invalid date", () => {
    assert.equal(formatDate("invalid"), "");
  });

  it("returns empty string for empty input", () => {
    assert.equal(formatDate(""), "");
  });
});
