"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { bankVariants } from "@/lib/nepal/bankVariants";
import type { BankFieldTolerances } from "@/lib/nepal/bankVariants";
import type { BankTemplate } from "@/lib/types";
import { getAllActiveTemplates } from "@/lib/templates";

interface AdminBankFormProps {
  bankKey?: string;
  onSave?: (bankKey: string, payeeY: number) => void;
}

export default function AdminBankForm({ bankKey: initialBankKey, onSave }: AdminBankFormProps) {
  const { t, locale } = useLanguage();
  const [selectedBank, setSelectedBank] = useState(initialBankKey ?? "");
  const [payeeY, setPayeeY] = useState(20.5);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const availableBanks = Object.keys(bankVariants).sort();
  const variant: BankFieldTolerances | null = selectedBank ? bankVariants[selectedBank] ?? null : null;

  useEffect(() => {
    if (selectedBank && variant) {
      const payeeField = variant.fields["payee"];
      if (payeeField) {
        setPayeeY(payeeField.nominal);
      }
    }
  }, [selectedBank, variant]);

  const validatePayeeY = (value: number): string | null => {
    if (!variant) return null;
    const fieldTol = variant.fields["payee"];
    if (!fieldTol) return null;

    if (value < fieldTol.min) {
      return locale === "ne"
        ? `payeeY ${value}mm कम छ — न्यूनतम ${fieldTol.min}mm छ`
        : `payeeY ${value}mm is too high up — minimum is ${fieldTol.min}mm`;
    }
    if (value > fieldTol.max) {
      return locale === "ne"
        ? `payeeY ${value}mm धेरै तल छ — अधिकतम ${fieldTol.max}mm छ`
        : `payeeY ${value}mm risks MICR encroachment — maximum safe value is ${fieldTol.max}mm`;
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validatePayeeY(payeeY);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave?.(selectedBank, payeeY);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayeeY(Number(e.target.value));
    setError(null);
    setSaved(false);
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBank(e.target.value);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {locale === "ne" ? "बैंक सुरक्षा व्यवस्थापन" : "Bank Safety Validator"}
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="bank-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {locale === "ne" ? "बैंक चुन्नुहोस्" : "Select Bank"}
          </label>
          <select
            id="bank-select"
            value={selectedBank}
            onChange={handleBankChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— {locale === "ne" ? "बैंक चुन्नुहोस्" : "Select Bank"} —</option>
            {availableBanks.map((key) => {
              const v = bankVariants[key];
              return (
                <option key={key} value={key}>
                  {v?.bankName ?? key}
                </option>
              );
            })}
          </select>
        </div>

        {variant && (
          <>
            <div>
              <label htmlFor="payee-y" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === "ne"
                  ? `देयको Y-अवस्थिति (मिमी) — ${variant.bankName}`
                  : `Payee Y-Position (mm) — ${variant.bankName}`}
              </label>
              <input
                id="payee-y"
                type="number"
                step={0.1}
                min={variant.fields["payee"]?.min ?? 18}
                max={variant.fields["payee"]?.max ?? 25}
                value={payeeY}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {variant.fields["payee"] && (
                <small className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {locale === "ne"
                    ? `सुरक्षित सीमा: ${variant.fields["payee"].min}mm – ${variant.fields["payee"].max}mm`
                    : `Safe range: ${variant.fields["payee"].min}mm – ${variant.fields["payee"].max}mm`}
                </small>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  ⚠ {error}
                </span>
              </div>
            )}

            {saved && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {locale === "ne" ? "बचत गरिएको!" : "Saved successfully!"}
                </span>
              </div>
            )}
          </>
        )}

        <button
          onClick={handleSave}
          disabled={!selectedBank || !!error || payeeY === 0}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {locale === "ne" ? "बचत गर्नुस् / Save Safely" : "Save Safely"}
        </button>
      </div>
    </div>
  );
}
