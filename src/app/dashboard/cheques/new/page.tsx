"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "@/components/dashboard/sidebar";
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
  currency: string;
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
  currency: "NPR",
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
      setSaveError("Please login first.");
      setSaving(false);
      return;
    }

    const numericAmount = Number(form.amount);

    if (!numericAmount || numericAmount <= 0) {
      setSaveError("Please enter a valid amount.");
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
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 30px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              <ChevronLeft size={16} />
              Back
            </Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
              New Cheque
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>
            {/* Form */}
            <div className="card">
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Cheque Information</h2>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Nepal Bank Limited"
                    value={form.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    className={INPUT}
                  />
                </div>

                <div className="field">
                  <label>Payee Name</label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Enter payee name"
                    value={form.payeeName}
                    onChange={(e) => updateField("payeeName", e.target.value.slice(0, 120))}
                    className={INPUT}
                  />
                  {!payeeValidation.valid && form.payeeName !== "" && (
                    <p className="error-state">{payeeValidation.error}</p>
                  )}
                </div>

                <div className="two-columns">
                  <div className="field">
                    <label>Amount</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => updateField("amount", e.target.value)}
                      className={INPUT}
                    />
                    {form.amount !== "" && !amountValidation.valid && (
                      <p className="error-state">{amountValidation.error}</p>
                    )}
                  </div>
                  <div className="field">
                    <label>Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => updateField("currency", e.target.value)}
                      className={INPUT}
                    >
                      <option value="NPR">NPR</option>
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Amount in Words</label>
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

                <div className="two-columns">
                  <div className="field">
                    <label>Cheque Date</label>
                    <input
                      type="date"
                      value={form.chequeDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateField("chequeDate", e.target.value)}
                      className={INPUT}
                    />
                    {form.chequeDate && !dateValidation.valid && (
                      <p className="error-state">{dateValidation.error}</p>
                    )}
                  </div>
                  <div className="field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      placeholder="001234567890"
                      value={form.accountNumber}
                      onChange={(e) => updateField("accountNumber", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Signature Text</label>
                  <input
                    type="text"
                    placeholder="Authorized Signature"
                    value={form.branchName}
                    onChange={(e) => updateField("branchName", e.target.value)}
                    className={INPUT}
                  />
                </div>

                <div className="field">
                  <label>Remarks</label>
                  <textarea
                    rows={2}
                    maxLength={240}
                    placeholder="Optional notes"
                    value={form.remarks}
                    onChange={(e) => updateField("remarks", e.target.value)}
                    className={INPUT}
                  />
                </div>

                {saved && (
                  <p style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--success) 8%, transparent)", color: "var(--success)", fontSize: "0.88rem", fontWeight: 500, marginBottom: 12 }}>
                    <CheckCircle2 size={14} /> Draft saved successfully!
                  </p>
                )}

                {saveError && (
                  <p style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", fontSize: "0.88rem", fontWeight: 500, marginBottom: 12 }}>
                    <AlertTriangle size={14} /> {saveError}
                  </p>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => { setForm(emptyForm); setSaved(false); setSaveError(""); }}
                    style={{ flex: 1 }}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="button"
                    style={{ flex: 1 }}
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Cheque Preview</h2>
                <span className="preview-label">Live Preview</span>
              </div>

              <div className="cheque-wrapper">
                <div
                  style={{
                    width: 850,
                    height: 360,
                    background: "#fffdf5",
                    border: "2px solid #334155",
                    borderRadius: 6,
                    position: "relative",
                    padding: "30px 35px",
                    boxShadow: "0 5px 10px rgba(0,0,0,.1)",
                    backgroundImage:
                      "linear-gradient(rgba(100, 116, 139, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 116, 139, .08) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "center", fontSize: 22, fontWeight: "bold", marginBottom: 5 }}>
                    {form.bankName || "Bank Name"}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>
                    Kathmandu, Nepal
                  </div>

                  <div style={{ position: "absolute", right: 38, top: 75, fontSize: 15, fontWeight: "bold" }}>
                    {form.chequeDate
                      ? `Date: ${new Date(form.chequeDate).toLocaleDateString("en-GB")}`
                      : "Date: __________"}
                  </div>

                  <div style={{ position: "absolute", left: 40, top: 135, fontSize: 16 }}>
                    Pay to the order of: <strong>{form.payeeName || "________________________"}</strong>
                  </div>

                  <div style={{ position: "absolute", left: 40, top: 185, width: 650, borderBottom: "1px solid #334155", paddingBottom: 6, fontSize: 15 }}>
                    {form.amountWords || "______________________________________________ Only"}
                  </div>

                  <div style={{ position: "absolute", right: 38, top: 175, width: 135, border: "1px solid #334155", padding: "11px 8px", textAlign: "center", fontWeight: "bold", fontSize: 16 }}>
                    <span>{form.currency}</span>{" "}
                    <span>{Number(form.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ position: "absolute", right: 45, bottom: 65, width: 170, textAlign: "center", borderTop: "1px solid #334155", paddingTop: 8, fontSize: 12 }}>
                    {form.branchName || "Authorized Signature"}
                  </div>

                  <div style={{ position: "absolute", bottom: 18, left: 35, right: 35, borderTop: "1px solid #94a3b8", paddingTop: 8, fontFamily: "monospace", letterSpacing: 3, fontSize: 17 }}>
                    ⑆ {form.accountNumber || "0000000000"} ⑆ 0000000000 ⑆
                  </div>
                </div>
              </div>

              <p style={{ marginTop: 18, color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Preview shows how the cheque will print. Verify bank name, payee, amount and date before printing.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
