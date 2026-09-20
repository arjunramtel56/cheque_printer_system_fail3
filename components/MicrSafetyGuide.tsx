"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { getChequeSize } from "@/lib/sizes";
import { STANDARD_SIZE_ID } from "@/data/templates";

export default function MicrSafetyGuide() {
  const { t, locale } = useLanguage();

  const standardSize = getChequeSize(STANDARD_SIZE_ID);
  const chequeSizeLabel = standardSize
    ? locale === "ne"
      ? `${standardSize.widthMm} × ${standardSize.heightMm} mm`
      : `${standardSize.widthMm} × ${standardSize.heightMm} mm`
    : "";

  return (
    <section className="w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 py-10 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {locale === "ne" ? "नेपालको बैंकहरूका लागि सुरक्षित चेक प्रिन्ट" : "Secure Cheque Printing for Nepal Banks"}
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          {locale === "ne"
            ? "यो उपकरण केवल चेकका स्थायी क्षेत्रहरूमा (नाम, मिति, रकम) डाल्न मात्र प्रिन्ट गर्छ — तपाईंको स्वामित्वमा रहेका बैंक-जारी चेकमा। प्रयोग अघि संरेखण जाँच गर्नुहोस्।"
            : "This tool ONLY prints variable fields (name, date, amount) onto bank-issued cheques you already own. Verify alignment before use."}
        </p>

        {/* Visual MICR guide — shows exact red zone (bottom 0.5" / 7mm) */}
        <div className="relative mx-auto mb-8 w-full max-w-2xl h-44 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {/* Cheque body area */}
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-600 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xs text-center mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {chequeSizeLabel && (
                  <>
                    {locale === "ne" ? "चेक आकार:" : "Cheque size:"} {chequeSizeLabel}
                  </>
                )}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === "ne" ? "देयको नाम" : "Payee Name"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {locale === "ne" ? "रकम (अंक)" : "Amount (Figures)"}
              </div>
            </div>
          </div>

          {/* MICR safety zone — red overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-red-500/15 dark:bg-red-900/30 border-t border-red-500/50 dark:border-red-700 flex items-center justify-center"
            style={{ height: "0.5in", minHeight: "7mm" }}
          >
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              {typeof t("printOnlyThisArea") === "string" ? (locale === "ne" ? t("printOnlyThisAreaNe") : t("printOnlyThisArea")) : "PRINT ONLY THIS AREA"}
            </span>
          </div>

          {/* Safety label */}
          <div className="absolute bottom-1 left-2 text-xs text-red-600 dark:text-red-400 font-medium">
            {locale === "ne"
              ? "MICR ब्यान्ड — कुनै पनि स्याही नगर्नुहोस्"
              : "MICR BAND — DO NOT PRINT"}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {locale === "ne"
            ? "MICR लाईनलाई कुनै पनि छाप्नुहोस्। प्रिन्ट सेटिङमा १००% स्केलमा सेट गर्नुहोस्।"
            : "MICR line (bottom 0.5\" / 7mm) must never be printed over. Set print scale to 100% (NOT 'Fit to Page')."}
        </p>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <strong className="text-gray-700 dark:text-gray-300">{t("securityNoteTitle")} </strong>
          {t("disclaimer")}
        </div>
      </div>
    </section>
  );
}
