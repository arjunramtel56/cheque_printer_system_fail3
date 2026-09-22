"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  Printer,
  RotateCcw,
  UserRound,
  Banknote,
  Save,
} from "lucide-react";
import { amountToWords } from "@/lib/amount-to-words";
import { ChequeTemplate } from "@/types";
import ChequePreview from "@/components/cheque/cheque-preview";

interface Bank {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  templates: Array<{
    id: string;
    name: string;
    chequeWidth: number;
    chequeHeight: number;
    isDefault: boolean;
    fields: Array<{
      id: string;
      field: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      fontSize: number;
      fontFamily: string;
      fontWeight?: string;
      letterSpacing?: number;
      align?: string;
      rotation?: number;
      color?: string;
      format?: string;
    }>;
  }>;
}

interface PrintHistoryItem {
  id: string;
  name: string;
  lastPrinted: string;
}

export default function PrintPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [payeeName, setPayeeName] = useState("");
  const [chequeDate, setChequeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [recentPayees, setRecentPayees] = useState<string[]>([]);
  const [autoConvert, setAutoConvert] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const selectedTemplate = selectedBank?.templates.find((t) => t.id === selectedTemplateId);

  const templateForPreview: ChequeTemplate | null = selectedTemplate
    ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        bankId: selectedBank?.id || "",
        bankName: selectedBank?.name || "",
        chequeWidth: selectedTemplate.chequeWidth,
        chequeHeight: selectedTemplate.chequeHeight,
        fields: selectedTemplate.fields.map((f) => ({
          field: f.field,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          fontSize: f.fontSize,
          fontFamily: f.fontFamily,
          fontWeight: f.fontWeight,
          letterSpacing: f.letterSpacing,
          align: (f.align || "left") as "left" | "center" | "right",
          rotation: f.rotation,
          color: f.color,
          format: f.format,
        })),
      }
    : null;

  const previewFields: Record<string, string> = {
    date: chequeDate ? formatDate(chequeDate) : "",
    payee: payeeName || "",
    amountWords: amountWords || "",
    amountNumber: amount || "",
  };

  useEffect(() => {
    fetchBanks();
    loadRecentPayees();
    loadUserSettings();
  }, []);

  useEffect(() => {
    if (selectedBankId && !selectedTemplateId && selectedBank) {
      const defaultTemplate = selectedBank.templates.find((t) => t.isDefault) || selectedBank.templates[0];
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [selectedBankId, selectedBank]);

  useEffect(() => {
    if (autoConvert && amount) {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed) && parsed > 0) {
        setAmountWords(amountToWords(parsed, "en"));
      }
    }
  }, [amount, autoConvert]);

  async function fetchBanks() {
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("Failed to fetch banks");
      const data = await res.json();
      setBanks(data);

      const firstBank = data[0];
      if (firstBank) {
        setSelectedBankId(firstBank.id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function loadRecentPayees() {
    try {
      const res = await fetch("/api/payees?limit=10");
      if (!res.ok) throw new Error("Failed to fetch payees");
      const data = await res.json();
      setRecentPayees(data.map((p: any) => p.name));
    } catch {
      return [];
    }
  }

  async function loadUserSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      setAccountHolder(data.defaultAccountName || "");
    } catch {
      return;
    }
  }

  function formatDate(date: string) {
    if (!date) return "DDMMYYYY";
    const [year, month, day] = date.split("-");
    return `${day}${month}${year}`;
  }

  function handleAmountChange(value: string) {
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }

  function clearForm() {
    setPayeeName("");
    setAmount("");
    setAmountWords("");
  }

  async function handlePrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTemplateId || !payeeName || !amount || !chequeDate) {
      setError("Please fill in all required fields");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          payeeName,
          chequeDate: new Date(chequeDate).toISOString(),
          amountNumber: parseFloat(amount),
          amountWords: autoConvert ? amountToWords(parseFloat(amount), "en") : amountWords,
          accountHolder,
        }),
      });

      await fetch("/api/print-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chequeId: "temp",
          copies: 1,
        }),
      });

      window.print();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!selectedTemplateId || !payeeName || !amount || !chequeDate) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          payeeName,
          chequeDate: new Date(chequeDate).toISOString(),
          amountNumber: parseFloat(amount),
          amountWords: autoConvert ? amountToWords(parseFloat(amount), "en") : amountWords,
          accountHolder,
        }),
      });

      if (!res.ok) throw new Error("Failed to save draft");
      const data = await res.json();
      alert("Draft saved successfully");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 no-print">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FileText size={14} />
            Cheque Management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Create New Cheque
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Fill in the details and preview your cheque before printing.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-print">
              <div>
                <h2 className="font-bold text-slate-900">Cheque Preview</h2>
                <p className="mt-1 text-xs text-slate-500">Verify details before printing</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                Live Preview
              </span>
            </div>

            <div className="flex min-h-[300px] items-center justify-center overflow-auto bg-slate-50 p-4 md:p-6">
              <ChequePreview
                template={templateForPreview}
                fields={previewFields}
                chequeImage={selectedBank?.code ? `/images/${selectedBank.code.toLowerCase()}-bank-cheque.png` : undefined}
              />
            </div>

            <p className="pt-3 text-center text-xs text-slate-400 no-print">
              What you see in the preview is what will be printed.
            </p>
          </section>

          <aside className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-2">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <FileText size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Cheque Details</h2>
                  <p className="mt-1 text-xs text-slate-500">Enter your cheque information</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePrint} className="space-y-5 pt-5">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Banknote size={16} className="text-slate-400" />
                  Bank
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => {
                    setSelectedBankId(e.target.value);
                    setSelectedTemplateId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBank && selectedBank.templates.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    {selectedBank.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="accountHolder" className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound size={16} className="text-slate-400" />
                  Account Holder
                </label>
                <input
                  id="accountHolder"
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Your name/account"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label htmlFor="payeeName" className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound size={16} className="text-slate-400" />
                  Payee Name
                </label>
                <p className="mb-2 text-xs text-slate-400">भुक्तानी पाउने व्यक्तिको नाम</p>
                <input
                  id="payeeName"
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Ram Bahadur"
                  required
                  list="recent-payees"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <datalist id="recent-payees">
                  {recentPayees.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="chequeDate" className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} className="text-slate-400" />
                  Cheque Date
                </label>
                <p className="mb-2 text-xs text-slate-400">Cheque मिति</p>
                <input
                  id="chequeDate"
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label htmlFor="amountInWords" className="mb-1 block text-sm font-semibold text-slate-700">
                  Amount in Words
                </label>
                <p className="mb-2 text-xs text-slate-400">रकम अक्षरमा</p>
                <textarea
                  id="amountInWords"
                  value={amountWords}
                  onChange={(e) => setAmountWords(e.target.value)}
                  placeholder="Ninety-Nine Thousand Rupees Only"
                  rows={3}
                  required
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{amountWords.length}/200</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={autoConvert}
                      onChange={(e) => setAutoConvert(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Auto-convert
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="mb-1 block text-sm font-semibold text-slate-700">
                  Amount in Number
                </label>
                <p className="mb-2 text-xs text-slate-400">रकम अंकमा</p>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                  <span className="flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-500">
                    Rs.
                  </span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw size={16} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Printer size={17} />
                    {isLoading ? "Processing..." : "Print Cheque"}
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
