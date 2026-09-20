"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { getChequeSize } from "@/lib/sizes";
import { STANDARD_SIZE_ID } from "@/data/templates";

export default function MicrSafetyGuide() {
  const { t, locale } = useLanguage();

  const standardSize = getChequeSize(STANDARD_SIZE_ID);
  const chequeSizeLabel = standardSize
    ? `${standardSize.widthMm} × ${standardSize.heightMm} mm`
    : "";

  const micrLabel = t("printOnlyThisAreaNe");
  const renderMicrLabel = micrLabel && micrLabel !== "printOnlyThisAreaNe"
    ? micrLabel
    : t("printOnlyThisArea");

  return (
    <section className="w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 py-10 px-4" data-micr-safety-section>
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("secureNepalCheques")}
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          {t("disclaimer")}
        </p>

        {/* Visual MICR guide — shows exact red zone (bottom 0.5" / 7mm) */}
        <div className="relative mx-auto mb-8 w-full max-w-2xl h-44 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {/* Cheque body area */}
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-600 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xs text-center mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {chequeSizeLabel && (
                  <>
                    {t("chequeSizeLabel")}: {chequeSizeLabel}
                  </>
                )}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("payeeLabel")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("amountLabel")}
              </div>
            </div>
          </div>

          {/* MICR safety zone — red overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-red-500/15 dark:bg-red-900/30 border-t border-red-500/50 dark:border-red-700 flex items-center justify-center"
            style={{ height: "0.5in", minHeight: "7mm" }}
          >
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              {renderMicrLabel}
            </span>
          </div>

          {/* Safety label */}
          <div className="absolute bottom-1 left-2 text-xs text-red-600 dark:text-red-400 font-medium" data-micr-label="true">
            {locale === "ne"
              ? "MICR ब्यान्ड — कुनै पनि स्याही नगर्नुहोस्"
              : "MICR BAND — DO NOT PRINT"}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("setScale100")}
        </p>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <strong className="text-gray-700 dark:text-gray-300">{t("securityNoteTitle")} </strong>
          {t("securityNoteDesc")}
        </div>
      </div>
    </section>
  );
}
