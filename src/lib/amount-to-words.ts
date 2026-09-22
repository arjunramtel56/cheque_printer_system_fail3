const NEPALI_WORDS = [
  "शून्य",
  "एक",
  "दुई",
  "तीन",
  "चार",
  "पाँच",
  "छ",
  "सात",
  "आठ",
  "नौ",
  "दस",
  "एघार",
  "बाह्र",
  "तेह्र",
  "चौध",
  "पन्ध्र",
  "सोह्र",
  "सत्र",
  "अठार",
  "उन्निस",
  "बीस",
  "एक्काइस",
  "बाइस",
  "तेइस",
  "चौबिस",
  "पच्चीस",
  "छब्बिस",
  "सत्ताइस",
  "अठाइस",
  "उनतीस",
  "तीस",
  "एकतीस",
  "बतीस",
  "तेतीस",
  "चौंतीस",
  "पैंतीस",
  "छतीस",
  "सैंतीस",
  "अड्तीस",
  "उन्चालीस",
  "चालीस",
  "एकचालीस",
  "बयालीस",
  "तैंचालीस",
  "चवालीस",
  "पैंतालीस",
  "छयालीस",
  "सैंतालीस",
  "अड्चालीस",
  "उन्नसी",
  "पचास",
  "एकाउन्न",
  "बाउन्न",
  "त्रेपन्न",
  "चौवन्न",
  "पचपन्न",
  "छपन्न",
  "सन्ताउन्न",
  "अन्ठाउन्न",
  "उन्नसी",
  "साठी",
  "एकसठी",
  "बासठी",
  "तीरसठी",
  "चौंसठी",
  "पैंसठी",
  "छियासठी",
  "सडसठी",
  "अड्सठी",
  "उन्हत्तर",
  "सत्तरी",
  "एकहत्तर",
  "बहत्तर",
  "तिहत्तर",
  "चौहत्तर",
  "पचहत्तर",
  "छहत्तर",
  "सतहत्तर",
  "अठहत्तर",
  "उन्सी",
  "अस्सी",
  "एकासी",
  "बयासी",
  "तिरासी",
  "चौरासी",
  "पचासी",
  "छियासी",
  "सतासी",
  "अटासी",
  "उन्नब्बे",
  "नब्बे",
  "एकानब्बे",
  "बानब्बे",
  "तिरानब्बे",
  "चौरानब्बे",
  "पंचानब्बे",
  "छियानब्बे",
  "सन्तानब्बे",
  "अन्डानब्बे",
  "निरानब्बे",
];

const ENGLISH_UNITS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const ENGLISH_TEENS = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const ENGLISH_TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertEnglish(number: number): string {
  if (number === 0) return "Zero";

  const units = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab"];
  let result = "";
  let unitIndex = 0;
  let remaining = number;

  const lastThree = remaining % 1000;
  remaining = Math.floor(remaining / 1000);
  if (lastThree > 0) {
    result = convertHundredsEnglish(lastThree);
  }

  while (remaining > 0) {
    const chunk = remaining % 100;
    if (chunk > 0) {
      const unitStr = units[unitIndex + 1] || "";
      result = convertHundredsEnglish(chunk) + " " + unitStr + " " + result;
    }
    remaining = Math.floor(remaining / 100);
    unitIndex++;
  }

  return result.trim().replace(/\s+/g, " ");
}

function convertHundredsEnglish(n: number): string {
  if (n >= 100) {
    return (
      ENGLISH_UNITS[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 > 0 ? " " + convertTensEnglish(n % 100) : "")
    );
  }
  return convertTensEnglish(n);
}

function convertTensEnglish(n: number): string {
  if (n < 10) return ENGLISH_UNITS[n];
  if (n < 20) return ENGLISH_TEENS[n - 10];
  const tens = ENGLISH_TENS[Math.floor(n / 10)];
  const unit = ENGLISH_UNITS[n % 10];
  return unit ? tens + " " + unit : tens;
}

function convertNepali(number: number): string {
  if (number === 0) return NEPALI_WORDS[0];

  const units = ["", "हजार", "लाख", "करोड", "अरब", "खरब"];
  let result = "";
  let unitIndex = 1;
  let remaining = number;

  const lastThree = remaining % 1000;
  remaining = Math.floor(remaining / 1000);
  if (lastThree > 0) {
    result = convertThreeDigitsNepali(lastThree);
  }

  while (remaining > 0) {
    const chunk = remaining % 100;
    if (chunk > 0) {
      const unitStr = units[unitIndex] || "";
      result = NEPALI_WORDS[chunk] + " " + unitStr + " " + result;
    }
    remaining = Math.floor(remaining / 100);
    unitIndex++;
  }

  return result.trim().replace(/\s+/g, " ");
}

function convertThreeDigitsNepali(n: number): string {
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const remainderStr = remainder > 0 ? " " + NEPALI_WORDS[remainder] : "";
    return `${NEPALI_WORDS[hundreds]} सय${remainderStr}`;
  }
  return NEPALI_WORDS[n];
}

export function amountToWords(amount: number | string, language: "en" | "ne" = "en"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num) || num < 0) {
    return language === "ne" ? "अमान्य रकम" : "Invalid amount";
  }

  if (num === 0) {
    return language === "ne" ? "शून्य रुपैयाँ मात्र" : "Zero Rupees Only";
  }

  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  if (paise === 100) {
    rupees += 1;
    paise = 0;
  }

  if (language === "ne") {
    const rupeesWords = convertNepali(rupees);
    if (paise > 0) {
      return `${rupeesWords} रुपैयाँ र ${convertNepali(paise)} पैसा मात्र`;
    }
    return `${rupeesWords} मात्र`;
  }

  const rupeesWords = convertEnglish(rupees);
  const result = `${rupeesWords} Rupees`;

  if (paise > 0) {
    return `${result} and ${convertEnglish(paise)} Paise Only`;
  }

  return `${result} Only`;
}

export function formatAmount(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";

  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
