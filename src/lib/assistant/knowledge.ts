import { PLAN_PRICING, VALID_DURATIONS } from "@/lib/pricing";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

/**
 * Deterministic knowledge base for the Cheque Assistant.
 *
 * Source discipline (requirement #6) — every answer is labelled with its source:
 *  - PRODUCT   facts from this application's actual configuration and database
 *              (pricing.ts, config.ts, bank templates). Always described as
 *              system behaviour, never as regulation.
 *  - PRACTICE  general, widely accepted cheque-handling practice that the
 *              system itself implements. Never attributed to NRB.
 *  - NRB       only statements the assistant can make about Nepal Rastra Bank
 *              publications it can actually verify — currently none — so any
 *              regulatory question falls back to an explicit
 *              "cannot verify" answer instead of an invented rule.
 *
 * There is deliberately no LLM here: answers are matched by intent keywords
 * against this file, which keeps responses fast, cheap and impossible to
 * hallucinate.
 */

export type AnswerSource = "PRODUCT" | "PRACTICE" | "NRB" | "SYSTEM";

export interface AssistantAnswer {
  text: string;
  source: AnswerSource;
  /** Optional follow-up suggestion chips rendered under the answer. */
  suggestions?: string[];
}

interface Intent {
  id: string;
  /** Keywords (lowercase) that activate this intent; scored by match count. */
  keywords: string[];
  en: AssistantAnswer;
  ne: AssistantAnswer;
}

/* ------------------------------------------------------------------ */
/* Source labels shown with each answer                                */
/* ------------------------------------------------------------------ */

export const SOURCE_LABELS: Record<AnswerSource, { en: string; ne: string }> = {
  PRODUCT: {
    en: "Reactify system feature",
    ne: "रियाक्टिफाई सिस्टम सुविधा",
  },
  PRACTICE: {
    en: "General cheque practice (as implemented by this system)",
    ne: "सामान्य चेक अभ्यास (यो सिस्टमले लागू गरेको)",
  },
  NRB: {
    en: "Nepal Rastra Bank publication",
    ne: "नेपाल राष्ट्र बैंक प्रकाशन",
  },
  SYSTEM: {
    en: "Assistant notice",
    ne: "सहायक सूचना",
  },
};

/* ------------------------------------------------------------------ */
/* Cached, DB-backed product data (requirement #2: server-side caching) */
/* ------------------------------------------------------------------ */

let bankCache: { names: string[]; count: number; expiresAt: number } | null = null;
const BANK_CACHE_TTL_MS = 10 * 60 * 1000;

async function getBankData(): Promise<{ names: string[]; count: number }> {
  if (bankCache && bankCache.expiresAt > Date.now()) {
    return { names: bankCache.names, count: bankCache.count };
  }
  try {
    const banks = await prisma.bank.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    });
    const names = banks.map((b) => b.name);
    bankCache = { names, count: names.length, expiresAt: Date.now() + BANK_CACHE_TTL_MS };
    return { names, count: names.length };
  } catch {
    // Never let a DB hiccup break the assistant — degrade gracefully.
    return { names: [], count: 0 };
  }
}

function pricingTable(): string {
  const rows = Object.entries(PLAN_PRICING)
    .map(([plan, durations]) => {
      const parts = VALID_DURATIONS.map((m) => `NPR ${durations[m]} (${m} mo)`);
      return `${plan}: ${parts.join(", ")}`;
    })
    .join(" · ");
  return rows;
}

/* ------------------------------------------------------------------ */
/* Intents — cheque printing, payments, scope refusal                  */
/* ------------------------------------------------------------------ */

const INTENTS: Intent[] = [
  {
    id: "print-steps",
    keywords: [
      "how do i print",
      "how to print",
      "print a cheque",
      "print cheque",
      "printing steps",
      "create cheque",
      "new cheque",
      "चेक प्रिन्ट",
    ],
    en: {
      source: "PRODUCT",
      text: [
        "To print a cheque in the system:",
        "1. Open Print Cheque from the dashboard sidebar.",
        "2. Select a Bank Template — printing stays blocked until you choose one.",
        "3. Fill in the beneficiary name, amount (figures) and date; the amount in words is generated automatically.",
        '4. Optionally add the cheque number, a memo, and tick "Print A/C PAYEE ONLY" to add the crossing.',
        "5. Check the live preview, then press Print Cheque and use your browser's print dialog (A4 paper, 100% scale, no margins scaling).",
      ].join("\n"),
      suggestions: [
        "What should I check before printing?",
        "Why is my cheque alignment incorrect?",
      ],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "सिस्टममा चेक प्रिन्ट गर्न:",
        '१. ड्यासबोर्डबाट "चेक प्रिन्ट" खोल्नुहोस्।',
        "२. बैंक टेम्पलेट छान्नुहोस् — टेम्पलेट छानिएसम्म प्रिन्ट बन्द रहन्छ।",
        "३. प्राप्तकर्ताको नाम, रकम (अंकमा) र मिति भर्नुहोस्; रकम अक्षरमा स्वतः तयार हुन्छ।",
        '४. चाहनुहुनेमा चेक नम्बर र टिप्पणी थप्नुहोस्, र "A/C PAYEE ONLY" छनोटले क्रसिङ थप्छ।',
        '५. लाइभ पूर्वावलोकन जाँच्नुहोस्, अनि "चेक प्रिन्ट गर्नुहोस्" थिचेर ब्राउजरको प्रिन्ट संवाद (A4 कागज, १००% स्केल) प्रयोग गर्नुहोस्।',
      ].join("\n"),
      suggestions: ["प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?", "चेकको मिलान किन गलत छ?"],
    },
  },
  {
    id: "alignment",
    keywords: [
      "alignment",
      "aligned",
      "misaligned",
      "position",
      "offset",
      "shift",
      "not centered",
      "not centered",
      "wrong place",
      "moved",
      "मिलान",
    ],
    en: {
      source: "PRODUCT",
      text: [
        "If printed text lands in the wrong place on the cheque:",
        "1. Confirm you selected the correct bank template — field positions come from the template.",
        "2. Print a plain test on the cheque sheet and note how far the text is off, in mm.",
        "3. Open Advanced Print Calibration on the print screen and set Top Offset and Left Offset to compensate (positive values move the print down/right).",
        "4. Save the calibration profile — it is remembered per template for your browser.",
        "5. Print again. Each printer feeds paper differently, so expect one or two test sheets.",
      ].join("\n"),
      suggestions: ["What should I check before printing?", "How do I print a cheque?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "प्रिन्ट भएको टेक्स्ट चेकमा गलत ठाउँमा परे:",
        "१. सही बैंक टेम्पलेट छानिएको छ कि छैन जाँच्नुहोस् — फिल्डको स्थान टेम्पलेटबाट आउँछ।",
        "२. चेक कागजमा एउटा परीक्षण प्रिन्ट निकाल्नुहोस् र टेक्स्ट कति मिमी तल/माथि वा दायाँ/बायाँ छ भनेर नोट गर्नुहोस्।",
        '३. प्रिन्ट स्क्रिनको "उन्नत प्रिन्ट क्यालिब्रेशन" मा गई Top Offset र Left Offset मिलाउनुहोस्।',
        "४. क्यालिब्रेशन प्रोफाइल सुरक्षित गर्नुहोस् — टेम्पलेट अनुसार ब्राउजरमा सम्झिन्छ।",
        "५. फेरि प्रिन्ट गर्नुहोस्। प्रिन्टर अनुसार कागज फिड फरक हुन्छ, त्यसैले एक-दुई परीक्षण सheet लाग्न सक्छ।",
      ].join("\n"),
      suggestions: ["प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?", "चेक कसरी प्रिन्ट गर्ने?"],
    },
  },
  {
    id: "pre-print-check",
    keywords: [
      "before printing",
      "check before",
      "prepare",
      "what should i check",
      "checklist",
      "prerequisites",
      "प्रिन्ट अघि",
    ],
    en: {
      source: "PRACTICE",
      text: [
        "Before printing on a real cheque:",
        "1. Verify the bank template matches your cheque book (correct bank, standard commercial cheque 190.5 × 88.9 mm).",
        "2. Confirm the beneficiary name is spelled exactly as it should appear — banks can reject mismatched names.",
        "3. Confirm the amount in figures and words match; the system generates the words from the figures automatically.",
        "4. Check the date — post-dated or stale cheques follow your bank's rules.",
        "5. Make sure the preview shows exactly what you want printed, including the A/C PAYEE ONLY crossing if needed.",
        "6. Use a test sheet first if your printer has not been calibrated for cheques.",
      ].join("\n"),
      suggestions: ["Why is my cheque alignment incorrect?", "How do I print a cheque?"],
    },
    ne: {
      source: "PRACTICE",
      text: [
        "साँचो चेकमा प्रिन्ट गर्नुअघि:",
        "१. बैंक टेम्पलेट तपाईंको चेक बुकसँग मिल्छ कि मिल्दैन (सही बैंक, स्टान्डर्ड वाणिज्य चेक १९०.५ × ८८.९ मिमी)।",
        "२. प्राप्तकर्ताको नाम ठीक त्यसै लेखिएको छ कि छैन — नाम नमिले बैंकले चेक फिर्ता गर्न सक्छ।",
        "३. रकम अंक र अक्षर मिल्छ कि मिल्दैन; सिस्टमले अंकबाट अक्षर स्वतः बनाउँछ।",
        "४. मिति जाँच्नुहोस् — पोस्ट-डेटेड वा पुरानो चेक बैंकको नियम अनुसार लागू हुन्छ।",
        "५. पूर्वावलोकनमा जे देखिन्छ त्यही प्रिन्ट हुन्छ — A/C PAYEE ONLY पनि जाँच्नुहोस्।",
        "६. प्रिन्टर क्यालिब्रेट नगरिएको भए पहिले परीक्षण कागजमा प्रिन्ट गर्नुहोस्।",
      ].join("\n"),
      suggestions: ["चेकको मिलान किन गलत छ?", "चेक कसरी प्रिन्ट गर्ने?"],
    },
  },
  {
    id: "printing-method",
    keywords: [
      "printing method",
      "print method",
      "a4 carrier",
      "carrier",
      "paper size",
      "paper type",
      "which printer",
      "printer support",
      "supported printers",
      "प्रिन्टिङ विधि",
    ],
    en: {
      source: "PRODUCT",
      text: [
        "The system prints a standard commercial cheque (190.5 × 88.9 mm) centred on a portrait A4 sheet (210 × 297 mm) using the browser's print dialog.",
        "There are no alternative printing methods to choose — the A4 carrier layout is the only implemented one, and orientation and paper handling are handled internally.",
        "Any printer that can print A4 sheets from your browser can be used; exact alignment is tuned per printer with the calibration offsets.",
        "Note: physical print compatibility with specific printer models has not been verified — use a test sheet first.",
      ].join("\n"),
      suggestions: ["Why is my cheque alignment incorrect?", "How does payment verification work?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "सिस्टमले स्टान्डर्ड वाणिज्य चेक (१९०.५ × ८८.९ मिमी) लाई पोर्ट्रेट A4 कागज (२१० × २९७ मिमी) मा ब्राउजरको प्रिन्ट संवाद प्रयोग गरी प्रिन्ट गर्छ।",
        "छान्नुपर्ने वैकल्पिक प्रिन्टिङ विधि छैन — A4 क्यारियर लेआउट नै लागू भएको एउटा विधि हो, र ओरिएन्टेसन/कागज ह्यान्डलिङ आन्तरिक रूपमा मिलाइएको छ।",
        "ब्राउजरबाट A4 प्रिन्ट गर्न सक्ने जुनसुकै प्रिन्टर प्रयोग गर्न सकिन्छ; सटीक मिलान क्यालिब्रेशन अफसेटले गरिन्छ।",
        "ध्यान दिनुहोस्: विशेष प्रिन्टर मोडेलसँगको भौतिक मिलान परीक्षण भएको छैन — पहिले परीक्षण कागज प्रयोग गर्नुहोस्।",
      ].join("\n"),
      suggestions: ["चेकको मिलान किन गलत छ?", "भुक्तानी प्रमाणीकरण कसरी हुन्छ?"],
    },
  },
  {
    id: "bank-templates",
    keywords: [
      "bank template",
      "bank list",
      "supported bank",
      "which bank",
      "banks available",
      "select bank",
      "template selection",
      "बैंक सूची",
      "बैंक टेम्पलेट",
    ],
    en: {
      source: "PRODUCT",
      text: "__BANK_ANSWER_EN__",
      suggestions: ["How do I print a cheque?", "What should I check before printing?"],
    },
    ne: {
      source: "PRODUCT",
      text: "__BANK_ANSWER_NE__",
      suggestions: ["चेक कसरी प्रिन्ट गर्ने?", "प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?"],
    },
  },
  {
    id: "preview",
    keywords: ["preview", "what you see", "live preview", "पूर्वावलोकन"],
    en: {
      source: "PRODUCT",
      text: [
        "The cheque preview is a live, print-parity view: what you see in the preview is exactly what will be printed, including the date digit boxes, the crossing and the amount box.",
        "If the preview looks right but the paper output does not, that is a printer-feeding difference — fix it with the Advanced Print Calibration offsets.",
      ].join("\n"),
      suggestions: ["Why is my cheque alignment incorrect?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "चेक पूर्वावलोकन प्रिन्टसँग उही देखिने लाइभ दृश्य हो: पूर्वावलोकनमा जे देखिन्छ त्यही प्रिन्ट हुन्छ — मिति बक्स, क्रसिङ र रकम बक्ससहित।",
        'पूर्वावलोकन ठीक देखिन्छ तर कागजमा फरक परे त्यो प्रिन्टर फिडको फरक हो — "उन्नत प्रिन्ट क्यालिब्रेशन" ले मिलाउनुहोस्।',
      ].join("\n"),
      suggestions: ["चेकको मिलान किन गलत छ?"],
    },
  },
  {
    id: "payment-methods",
    keywords: [
      "payment method",
      "how to pay",
      "pay for",
      "fonepay",
      "qr",
      "payment options",
      "upgrade",
      "subscribe",
      "subscription cost",
      "price",
      "pricing",
      "plan cost",
      "भुक्तानी",
      "मूल्य",
    ],
    en: {
      source: "PRODUCT",
      text: [
        "Subscriptions are paid by scanning the Fonepay QR code shown on the Subscription page, then submitting the payment reference and a screenshot/proof of the transfer.",
        `Prices (from the system's current pricing): ${pricingTable()}.`,
        "The amount is always computed on the server from your selected plan and duration — you never enter it manually.",
      ].join("\n"),
      suggestions: ["How does payment verification work?", "What does the free trial include?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "सदस्यता भुक्तानी सब्सक्रिप्शन पृष्ठमा देखिने फोनपे QR कोड स्क्यान गरी, भुक्तानी रेफरेन्स र काटिएको रसिदको प्रमाण पेस गरेर गरिन्छ।",
        `मूल्य (सिस्टमको वर्तमान मूल्यसूची): ${"__PRICING_NE__"}.`,
        "रकम सधैं सर्भरले तपाईंको योजना र अवधि अनुसार गणना गर्छ — म्यानुअल रूपमा भर्नु पर्दैन।",
      ].join("\n"),
      suggestions: ["भुक्तानी प्रमाणीकरण कसरी हुन्छ?", "निःशुल्क ट्रायलमा के पाइन्छ?"],
    },
  },
  {
    id: "payment-verification",
    keywords: [
      "payment verification",
      "verify payment",
      "payment status",
      "pending",
      "how long",
      "activation",
      "activated",
      "not activated",
      "approve",
      "प्रमाणीकरण",
      "सक्रिय",
    ],
    en: {
      source: "PRODUCT",
      text: [
        "Payment verification flow (system feature):",
        "1. You submit the payment reference and proof on the Subscription page — the payment is stored with status PENDING_VERIFICATION.",
        "2. Our team verifies the transfer against the reference and approves it.",
        "3. On approval your subscription activates immediately and your account is upgraded.",
        "If a payment stays pending for long, re-check that the reference matches the transfer and contact support.",
      ].join("\n"),
      suggestions: ["What are the payment methods?", "What does the free trial include?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        "भुक्तानी प्रमाणीकरण प्रक्रिया (सिस्टम सुविधा):",
        "१. सब्सक्रिप्शन पृष्ठमा भुक्तानी रेफरेन्स र प्रमाण पेस गर्नुहोस् — भुक्तानी PENDING_VERIFICATION अवस्थामा भण्डारण हुन्छ।",
        "२. हाम्रो टोलीले रेफरेन्स मिलाएर स्वीकृत गर्छ।",
        "३. स्वीकृत भएसँगै सदस्यता सक्रिय हुन्छ र खाता अपग्रेड हुन्छ।",
        "धेरै समय पेन्डिङ भए रेफरेन्स मिलेको छ कि छैन जाँच्नुहोस् र समर्थनमा सम्पर्क गर्नुहोस्।",
      ].join("\n"),
      suggestions: ["भुक्तानी विधि के-के हुन्?", "निःशुल्क ट्रायलमा के पाइन्छ?"],
    },
  },
  {
    id: "trial-info",
    keywords: ["trial", "free trial", "trial limit", "trial expire", "upgrade trial", "ट्रायल"],
    en: {
      source: "PRODUCT",
      text: "__TRIAL_ANSWER__",
      suggestions: ["What are the payment methods?", "How does payment verification work?"],
    },
    ne: {
      source: "PRODUCT",
      text: "__TRIAL_ANSWER_NE__",
      suggestions: ["भुक्तानी विधि के-के हुन्?", "भुक्तानी प्रमाणीकरण कसरी हुन्छ?"],
    },
  },
  {
    id: "history-save",
    keywords: ["history", "save", "draft", "recent cheques", "इतिहास", "ड्राफ्ट"],
    en: {
      source: "PRODUCT",
      text: [
        'While composing, "Save Draft" stores the cheque so you can reopen it later from My Cheques. After printing, the cheque appears in History with its print record.',
        "Trial accounts cannot save to history — that is a paid-plan feature; the Print Cheque and preview flows are available to trial users.",
      ].join("\n"),
      suggestions: ["What does the free trial include?"],
    },
    ne: {
      source: "PRODUCT",
      text: [
        'चेक बनाउँदा "ड्राफ्ट सुरक्षित" ले चेक भण्डारण गर्छ, जुन पछि "मेरा चेक" बाट खोल्न सकिन्छ। प्रिन्ट पछि चेक इतिहासमा प्रिन्ट रेकर्डसहित देखिन्छ।',
        "ट्रायल खाताले इतिहासमा सुरक्षित गर्न पाउँदैन — यो प्रीमियम सुविधा हो; प्रिन्ट र पूर्वावलोकन भने ट्रायलमा पनि उपलब्ध छन्।",
      ].join("\n"),
      suggestions: ["निःशुल्क ट्रायलमा के पाइन्छ?"],
    },
  },
  {
    id: "crossing",
    keywords: ["a/c payee", "crossing", "account payee", "क्रसिङ"],
    en: {
      source: "PRACTICE",
      text: [
        'The "A/C PAYEE ONLY" crossing tells the bank the amount may only be credited into a bank account, not cashed over the counter — a widely used safeguard against misuse of lost/stolen cheques.',
        "In this system it is a checkbox on the print screen; the crossing is added centred across the cheque when enabled. Whether to use a crossing is your choice; banks accept both crossed and uncrossed cheques.",
      ].join("\n"),
      suggestions: ["What should I check before printing?"],
    },
    ne: {
      source: "PRACTICE",
      text: [
        '"A/C PAYEE ONLY" क्रसिङले बैंकलाई भन्छ कि रकम कुनै बैंक खातामा मात्र जम्मा गर्न पाइने हो, काउन्टरबाट नगद निकाल्न मिल्दैन — हराएको/चोरिएको चेकको दुरुपयोग रोक्न प्रयोग हुने सामान्य सुरक्षा।',
        "यो सिस्टममा प्रिन्ट स्क्रिनको चेकबक्स हो; सक्रिय गर्दा क्रसिङ चेकको बीचमा थपिन्छ। क्रसिङ राख्ने वा नराख्ने तपाईंको छनोट हो; बैंकले दुवै स्वीकार गर्छन्।",
      ].join("\n"),
      suggestions: ["प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?"],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Scope, safety and refusal messages                                  */
/* ------------------------------------------------------------------ */

/** Requests for credentials/OTPs etc. — refuse explicitly, never comply. */
const SENSITIVE_PATTERNS = [
  /\b(otp|o\.t\.p|pin|c\.v\.v|cvv|password|passcode|one[\s-]?time (code|password)|security code)\b/i,
  /\b(card|account|crv)\s*(number|no)\b/i,
];

const OUT_OF_SCOPE_EN: AssistantAnswer = {
  source: "SYSTEM",
  text:
    "I'm the Cheque Printing Assistant, focused on:\n" +
    "• printing cheques with this system (templates, alignment, calibration, preview)\n" +
    "• payments and subscriptions for this system\n" +
    "• Nepal Rastra Bank cheque-related information where I can verify it.\n\n" +
    "I can't help with that question. " +
    siteConfig.name +
    " support: " +
    siteConfig.contact.email,
};

const OUT_OF_SCOPE_NE: AssistantAnswer = {
  source: "SYSTEM",
  text:
    "म चेक प्रिन्टिङ सहायक हुँ, जुन यी विषयमा केन्द्रित छ:\n" +
    "• यो सिस्टमबाट चेक प्रिन्ट (टेम्पलेट, मिलान, क्यालिब्रेशन, पूर्वावलोकन)\n" +
    "• यो सिस्टमको भुक्तानी र सदस्यता\n" +
    "• नेपाल राष्ट्र बैंकसँग सम्बन्धित चेक जानकारी (प्रमाणित हुने भएसम्म)।\n\n" +
    "यो प्रश्नमा मद्दत गर्न मिल्दैन। " +
    siteConfig.name +
    " समर्थन: " +
    siteConfig.contact.email,
};

const SENSITIVE_EN: AssistantAnswer = {
  source: "SYSTEM",
  text: "For your security I can't handle passwords, PINs, OTPs, card numbers or other confidential banking credentials — and the system will never ask you to share them with anyone, including support staff.",
};

const SENSITIVE_NE: AssistantAnswer = {
  source: "SYSTEM",
  text: "सुरक्षाका लागि म पासवर्ड, PIN, OTP, कार्ड नम्बर वा अन्य गोपनीय बैंकिङ विवरण सम्हाल्दिनँ — र सिस्टमले कहिल्यै त्यस्ता विवरण साट्न भन्दैन, समर्थन कर्मचारीलाई समेत होइन।",
};

/**
 * The honest NRB fallback. The assistant carries no corpus of NRB publications,
 * so any regulatory question gets this answer instead of an invented rule.
 */
export function nrbCannotVerify(lang: "en" | "ne", topic: string): AssistantAnswer {
  return lang === "ne"
    ? {
        source: "SYSTEM",
        text:
          `तपाईंले सोध्नुभएको विषय (${topic}) नेपाल राष्ट्र बैंकको नियम/निर्देशिकासँग सम्बन्धित देखिन्छ, ` +
          "तर मसँग त्यसलाई पुष्टि गर्ने आधिकारिक नेपाल राष्ट्र बैंक प्रकाशन उपलब्ध छैन — त्यसैले म नियमको बारेमा केही भन्न सक्दिनँ।\n\n" +
          "आधिकारिक जानकारीका लागि नेपाल राष्ट्र बैंकको आधिकारिक वेबसाइट (www.nrb.org.np) वा तपाईंको बैंकलाई सोध्नुहोस्।\n" +
          "यो सिस्टमको आफ्नै विशेषताहरू (टेम्पलेट, प्रिन्टिङ, भुक्तानी) बारे म निश्चित रूपमा जानकारी दिन सक्छु।",
      }
    : {
        source: "SYSTEM",
        text:
          `Your question (${topic}) appears to relate to Nepal Rastra Bank rules or directives, ` +
          "but I don't have an official NRB publication available that lets me verify the specific requirement — so I can't state what NRB requires here.\n\n" +
          "For authoritative information, please consult the official Nepal Rastra Bank website (www.nrb.org.np) or your bank directly.\n" +
          "I can give verified answers about this system's own features (templates, printing, payments) — just ask.",
      };
}

/* ------------------------------------------------------------------ */
/* Intent matching                                                     */
/* ------------------------------------------------------------------ */

/** NRB / regulation words that trigger the cannot-verify path. */
const NRB_PATTERNS = [
  /\bn\.?r\.?b\b/i,
  /नेपाल राष्ट्र बैंक/i,
  /\bnepal rastra bank\b/i,
  /\b(regulation|regulations|directive|directives|bylaws|act|circular|mandate|requires?|mandated|legal|law|compliance|uniform cross(?:ing)?|cheque print(?:ing)? standard)\b/i,
];

export interface KnowledgeContext {
  role: string;
  isTrial: boolean;
}

export async function answerQuestion(
  question: string,
  lang: "en" | "ne",
  ctx: KnowledgeContext
): Promise<AssistantAnswer> {
  const q = question.trim();

  if (!q) {
    return lang === "ne"
      ? { source: "SYSTEM", text: "कृपया प्रश्न लेख्नुहोस्।" }
      : { source: "SYSTEM", text: "Please type a question." };
  }

  // 1) Never engage with credential requests.
  if (SENSITIVE_PATTERNS.some((re) => re.test(q))) {
    return lang === "ne" ? SENSITIVE_NE : SENSITIVE_EN;
  }

  // 2) Detect NRB/regulatory framing for the cannot-verify fallback.
  const mentionsNrb = NRB_PATTERNS.some((re) => re.test(q));

  // 3) Score intents by keyword hits.
  const ql = q.toLowerCase();
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (ql.includes(kw)) score += kw.includes(" ") ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }

  if (!best) {
    if (mentionsNrb) {
      return nrbCannotVerify(lang, q.length > 80 ? q.slice(0, 77) + "…" : q);
    }
    return lang === "ne" ? OUT_OF_SCOPE_NE : OUT_OF_SCOPE_EN;
  }

  const answer = lang === "ne" ? best.intent.ne : best.intent.en;

  // 4) Fill DB-backed placeholders.
  let text = answer.text;
  if (text.includes("__BANK_ANSWER")) {
    const { names, count } = await getBankData();
    if (count === 0) {
      text =
        lang === "ne"
          ? "बैंक सूची लोड गर्न सकिएन। कृपया थोरै समयपछि पुनः प्रयास गर्नुहोस्।"
          : "I couldn't load the bank list right now — please try again shortly.";
    } else if (lang === "ne") {
      text =
        `सिस्टममा हाल ${count} वटा नेपाली वाणिज्य बैंकका स्टान्डर्ड चेक टेम्पलेट उपलब्ध छन् (हरेक १९०.५ × ८८.९ मिमी):\n` +
        names.map((n) => `• ${n}`).join("\n") +
        "\n\nप्रिन्ट स्क्रिनमा आफ्नो बैंक छान्नुहोस् — टेम्पलेट छानिएसम्म प्रिन्ट बन्द रहन्छ।";
    } else {
      text =
        `The system currently offers standard cheque templates for ${count} Nepali commercial banks (each 190.5 × 88.9 mm):\n` +
        names.map((n) => `• ${n}`).join("\n") +
        "\n\nSelect your bank on the print screen — printing stays blocked until a template is chosen.";
    }
  }
  if (text.includes("__PRICING_NE__")) {
    const rows = Object.entries(PLAN_PRICING)
      .map(([plan, durations]) => {
        const parts = VALID_DURATIONS.map((m) => `${durations[m]} (${m} महिना)`);
        return `${plan === "standard" ? "स्टान्डर्ड" : "बिजनेस"}: नेरू ${parts.join(", ")}`;
      })
      .join(" · ");
    text = text.replace("__PRICING_NE__", rows);
  }
  if (text.includes("__TRIAL_ANSWER")) {
    const trial = siteConfig.pricing.trial;
    const std = siteConfig.pricing.standard;
    if (lang === "ne") {
      text =
        `ट्रायल अवधि: ${trial.duration}। यसमा ${trial.features.join(", ")} उपलब्ध छन्।\n` +
        "ट्रायलमा चेक प्रिन्ट र पूर्वावलोकन चल्छ, तर इतिहासमा सुरक्षित गर्न र केही प्रीमियम सुविधाका लागि सदस्यता चाहिन्छ।\n" +
        "सदस्यता योजनाहरू: स्टान्डर्ड (१ महिना नेरू ३९ देखि), बिजनेस (१ महिना नेरू ५९ देखि) — विवरण सब्सक्रिप्शन पृष्ठमा।";
    } else {
      text =
        `The free trial lasts ${trial.duration} and includes: ${trial.features.join(", ")}.\n` +
        "Trial users can print cheques and use the preview, but saving to history and some premium features require a paid subscription.\n" +
        `Paid plans: standard (from NPR ${std.firstMonth?.replace("NPR ", "") || "39"} for 1 month), business (from NPR 59 for 1 month) — see the Subscription page for full pricing.`;
    }
  }

  // 5) Trial-role discipline: the trial limitation is stated inside the
  //    history-save answer itself; all other answers are identical for trial
  //    and paid users (the knowledge base holds no user-specific data).
  void ctx;

  return { ...answer, text };
}

/* ------------------------------------------------------------------ */
/* Suggested starter questions (locale-aware)                          */
/* ------------------------------------------------------------------ */

export const SUGGESTED_QUESTIONS: Record<"en" | "ne", string[]> = {
  en: [
    "How do I print a cheque?",
    "Why is my cheque alignment incorrect?",
    "What should I check before printing?",
    "What printing method does the system support?",
    "How does payment verification work?",
  ],
  ne: [
    "चेक कसरी प्रिन्ट गर्ने?",
    "चेकको मिलान किन गलत छ?",
    "प्रिन्ट गर्नुअघि के जाँच्नुपर्छ?",
    "सिस्टमले कुन प्रिन्टिङ विधि समर्थन गर्छ?",
    "भुक्तानी प्रमाणीकरण कसरी हुन्छ?",
  ],
};
