const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

export function integerToWords(value: number): string {
  value = Math.floor(Math.abs(value));
  if (value === 0) return "Zero";

  const groups: [number, string][] = [
    [100000000000, "Kharab"],
    [1000000000, "Arab"],
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [100, "Hundred"],
  ];

  const parts: string[] = [];

  for (const [size, name] of groups) {
    if (value >= size) {
      const count = Math.floor(value / size);
      parts.push(`${count < 100 ? belowHundred(count) : integerToWords(count)} ${name}`);
      value %= size;
    }
  }

  if (value > 0) {
    parts.push(belowHundred(value));
  }

  return parts.join(" ");
}

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
}

export function amountToWordsFromPaisa(amountPaisa: number): string {
  if (!Number.isFinite(amountPaisa) || amountPaisa < 0) {
    throw new Error("Amount must be a non-negative number.");
  }
  if (amountPaisa > 99_999_999_999_999) {
    throw new Error("Amount exceeds the supported range.");
  }

  const rupees = Math.floor(amountPaisa / 100);
  const paisa = amountPaisa % 100;
  let result = `${integerToWords(rupees)} Rupees`;
  if (paisa > 0) {
    result += ` and ${integerToWords(paisa)} Paisa`;
  }
  return result + " Only";
}

export function formatAmountDisplay(amountPaisa: number): string {
  return (amountPaisa / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateDigits(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error("Date must be in YYYY-MM-DD format.");
  }
  const [year, month, day] = isoDate.split("-");
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error("Invalid date.");
  }
  return `${day}${month}${year}`;
}

export function parseNumericAmount(input: string): number | null {
  if (!input || input.trim() === "") return null;
  const cleaned = input.replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num < 0) return null;
  if (num > 999999999999.99) return null;
  return Math.round(num * 100);
}

export function validateAmount(input: string): { valid: boolean; error?: string; paisa: number } {
  const paisa = parseNumericAmount(input);
  if (paisa === null) {
    return { valid: false, error: "Please enter a valid amount.", paisa: 0 };
  }
  return { valid: true, paisa };
}
