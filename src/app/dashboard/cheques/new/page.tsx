"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { createClient } from "@/lib/supabase/client";
import {
  amountToWordsFromPaisaLocalized,
  validateAmount,
  validateChequeDate,
  validatePayee,
} from "@/lib/amountWords";
import { useLanguage } from "@/components/layout/LanguageProvider";

const INPUT =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

interface ChequeForm {
  chequeNumber: string;
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  payeeName: string;
  amount: string;
  amountWords: string;
  chequeDate: string;
  remarks: string;
}

const emptyForm: ChequeForm = {
  chequeNumber: "",
  bankName: "",
  branchName: "",
  accountName: "",
  accountNumber: "",
  payeeName: "",
  amount: "",
  amountWords: "",
  chequeDate: "",
  remarks: "",
};

export default function NewChequePage() {
  const { locale: appLocale } = useLanguage();
  const supabase = createClient();

  const [form, setForm] = useState<ChequeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const wordOverrideRef = useState(false);

  function updateField<K extends keyof ChequeForm>(key: K, value: ChequeForm[K]) {
    if (key === "amount") {
      wordOverrideRef[1](false);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError("");
  }

  const amountValidation = useMemo(() => validateAmount(form.amount), [form.amount]);
  const payeeValidation = useMemo(() => validatePayee(form.payeeName), [form.payeeName]);
  const dateValidation = useMemo(
    () => (form.chequeDate ? validateChequeDate(form.chequeDate) : { valid: false, error: "Date is required." } as const),
    [form.chequeDate],
  );

  const autoWords = useMemo(() => {
    if (!amountValidation.valid || amountValidation.paisa === 0) return "";
    try {
      return amountToWordsFromPaisaLocalized(amountValidation.paisa, appLocale);
    } catch {
      return "";
    }
  }, [amountValidation, appLocale]);

  useMemo(() => {
    if (!wordOverrideRef[0]) {
      if (autoWords) updateField("amountWords", autoWords);
      else if (form.amount !== "") updateField("amountWords", "");
    }
  }, [autoWords]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setSaved(false);
    setSaveError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaveError("कृपया पहिले login गर्नुहोस्।");
      setSaving(false);
      return;
    }

    const numericAmount = Number(form.amount);

    if (!numericAmount || numericAmount <= 0) {
      setSaveError("कृपया सही amount राख्नुहोस्।");
      setSaving(false);
      return;
    }

    if (!form.chequeNumber.trim()) {
      setSaveError("Cheque number is required.");
      setSaving(false);
      return;
    }

    if (!form.bankName.trim()) {
      setSaveError("Bank name is required.");
      setSaving(false);
      return;
    }

    if (!form.branchName.trim()) {
      setSaveError("Branch name is required.");
      setSaving(false);
      return;
    }

    if (!form.accountName.trim()) {
      setSaveError("Account name is required.");
      setSaving(false);
      return;
    }

    if (!form.payeeName.trim()) {
      setSaveError("Payee name is required.");
      setSaving(false);
      return;
    }

    if (!form.chequeDate) {
      setSaveError("Cheque date is required.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("cheques").insert({
      user_id: user.id,
      cheque_number: form.chequeNumber.trim(),
      bank_name: form.bankName.trim(),
      branch_name: form.branchName.trim(),
      account_name: form.accountName.trim(),
      account_number: form.accountNumber.trim() || null,
      payee_name: form.payeeName.trim(),
      amount: numericAmount,
      amount_words: form.amountWords.trim(),
      cheque_date: form.chequeDate,
      remarks: form.remarks.trim() || null,
      status: "draft",
    });

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    setForm(emptyForm);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/dashboard/cheques"
                className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ChevronLeft size={16} />
                Back to Cheques
              </Link>
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Create New Cheque
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                नयाँ cheque details भरेर draft मा save गर्नुहोस्।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          <div className="mx-auto max-w-2xl">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Cheque Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cheque Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 000123"
                  value={form.chequeNumber}
                  onChange={(e) => updateField("chequeNumber", e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Bank Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nabil Bank"
                  value={form.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Branch Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Road Branch"
                  value={form.branchName}
                  onChange={(e) => updateField("branchName", e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Account Name + Account Number */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Account Name
                  </label>
                  <input
                    type="text"
                    placeholder="Account holder name"
                    value={form.accountName}
                    onChange={(e) => updateField("accountName", e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={form.accountNumber}
                    onChange={(e) => updateField("accountNumber", e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Payee Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payee Name
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Pay to the order of"
                  value={form.payeeName}
                  onChange={(e) => updateField("payeeName", e.target.value.slice(0, 120))}
                  className={INPUT}
                />
                {!payeeValidation.valid && form.payeeName !== "" && (
                  <p className="text-xs text-red-500 dark:text-red-400">{payeeValidation.error}</p>
                )}
              </div>

              {/* Amount + Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Amount (NPR)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => updateField("amount", e.target.value)}
                    className={INPUT}
                  />
                  {form.amount !== "" && !amountValidation.valid && (
                    <p className="text-xs text-red-500 dark:text-red-400">{amountValidation.error}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={form.chequeDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateField("chequeDate", e.target.value)}
                    className={INPUT}
                  />
                  {form.chequeDate && !dateValidation.valid && (
                    <p className="text-xs text-red-500 dark:text-red-400">{dateValidation.error}</p>
                  )}
                </div>
              </div>

              {/* Amount in Words */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Amount in Words
                </label>
                <textarea
                  rows={2}
                  maxLength={240}
                  placeholder="One Hundred Twenty Five Thousand Rupees Only"
                  value={form.amountWords}
                  onChange={(e) => {
                    wordOverrideRef[1](true);
                    updateField("amountWords", e.target.value);
                  }}
                  className={INPUT}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  maxLength={240}
                  placeholder="Optional notes"
                  value={form.remarks}
                  onChange={(e) => updateField("remarks", e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Success */}
              {saved && (
                <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 size={14} /> Draft saved successfully!
                </p>
              )}

              {/* Error */}
              {saveError && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle size={14} /> {saveError}
                </p>
              )}

              {/* Save Draft */}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
