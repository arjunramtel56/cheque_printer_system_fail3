"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChequePrintLayout } from "./ChequePrintLayout";
import { amountToWords } from "@/lib/amount-to-words";

type FormState = {
  payeeName: string;
  chequeDate: string;
  amountFigure: string;
  amountWords: string;
  chequeNumber: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
  language: "en" | "ne";
  offsetXmm: number;
  offsetYmm: number;
  bankTemplate: string;
  printingMethod: string;
  feedDirection: string;
  memo: string;
  accountPayeeOnly: boolean;
};

export function ChequeComposer() {
  const t = useTranslations("cheque");
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    payeeName: "",
    chequeDate: new Date().toISOString().slice(0, 10),
    amountFigure: "",
    amountWords: "",
    chequeNumber: "",
    orientation: "PORTRAIT",
    language: "en",
    offsetXmm: 0,
    offsetYmm: 0,
    bankTemplate: "Siddhartha Bank Limited — calibrated",
    printingMethod: "A4 carrier — fallback",
    feedDirection: "Long edge first (0°)",
    memo: "",
    accountPayeeOnly: true,
  });

  const numericAmount = useMemo(() => Number(form.amountFigure) || 0, [form.amountFigure]);

  const autoWords = useMemo(
    () => (numericAmount > 0 ? amountToWords(numericAmount, form.language) : ""),
    [numericAmount, form.language]
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handlePrint() {
    document.documentElement.classList.remove("dark");
    window.print();
  }

  const canPrint = !!form.payeeName && numericAmount > 0;

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[400px_1fr] bg-slate-50 min-h-screen">
      <aside className="no-print space-y-5 rounded-xl border bg-white p-5 shadow-sm h-fit">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-slate-400 text-sm">01</span> Cheque details
          </h2>
          <button
            className="text-sm text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1 rounded-md"
            onClick={() =>
              setForm({
                payeeName: "",
                chequeDate: new Date().toISOString().slice(0, 10),
                amountFigure: "",
                amountWords: "",
                chequeNumber: "",
                orientation: "PORTRAIT",
                language: "en",
                offsetXmm: 0,
                offsetYmm: 0,
                bankTemplate: "Siddhartha Bank Limited — calibrated",
                printingMethod: "A4 carrier — fallback",
                feedDirection: "Long edge first (0°)",
                memo: "",
                accountPayeeOnly: true,
              })
            }
          >
            Clear
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bank template</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={form.bankTemplate}
            onChange={(e) => update("bankTemplate", e.target.value)}
          >
            <option>Siddhartha Bank Limited — calibrated</option>
            <option>Nabil Bank — standard</option>
            <option>NIC Asia — custom</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Class A — Commercial Banks · cheque 190.5 × 88.9 mm
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Printing method</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-sm"
              value={form.printingMethod}
              onChange={(e) => update("printingMethod", e.target.value)}
            >
              <option>A4 carrier — fallback</option>
              <option>A4 carrier — direct</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Feed direction</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-sm"
              value={form.feedDirection}
              onChange={(e) => update("feedDirection", e.target.value)}
            >
              <option>Long edge first (0°)</option>
              <option>Short edge first (90°)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-50 rounded-lg p-3 border">
            <div className="text-slate-500 mb-1">Cheque</div>
            <div className="font-semibold text-slate-900">190.5 × 88.9 mm</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border">
            <div className="text-slate-500 mb-1">Paper</div>
            <div className="font-semibold text-slate-900">A4 · 210 × 297 mm</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border">
            <div className="text-slate-500 mb-1">Profile</div>
            <div className="font-semibold text-slate-900">A4 carrier · horizontal</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Payee name</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
            placeholder="e.g. Ram Bahadur Thapa"
            value={form.payeeName}
            onChange={(e) => update("payeeName", e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (NPR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">रू</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2.5 bg-white"
                placeholder="0.00"
                value={form.amountFigure}
                onChange={(e) => update("amountFigure", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cheque date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
              value={form.chequeDate}
              onChange={(e) => update("chequeDate", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount in words</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white h-20 resize-none"
            placeholder="Generated from the amount"
            value={form.amountWords || autoWords}
            onChange={(e) => update("amountWords", e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Generated from the amount and printed exactly as shown here.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Memo / reference (optional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
            placeholder="Invoice or payment reference"
            value={form.memo}
            onChange={(e) => update("memo", e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={form.accountPayeeOnly}
            onChange={(e) => update("accountPayeeOnly", e.target.checked)}
          />
          <div>
            <div className="text-sm font-semibold text-slate-800">Print A/C PAYEE ONLY</div>
            <div className="text-xs text-slate-500">
              Adds the crossing, centred on the cheque width.
            </div>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            {t("orientation")}
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.orientation}
              onChange={(e) => update("orientation", e.target.value as "PORTRAIT" | "LANDSCAPE")}
            >
              <option value="PORTRAIT">{t("portrait")}</option>
              <option value="LANDSCAPE">{t("landscape")}</option>
            </select>
          </label>

          <label className="block text-sm">
            {t("language")}
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.language}
              onChange={(e) => update("language", e.target.value as "en" | "ne")}
            >
              <option value="en">English</option>
              <option value="ne">नेपाली</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
            onClick={handlePrint}
            disabled={!canPrint}
          >
            {t("print")}
          </button>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
            disabled={!form.payeeName || !numericAmount}
            onClick={() => {
              const payload = {
                payeeName: form.payeeName,
                chequeDate: form.chequeDate,
                amountFigure: form.amountFigure,
                amountWords: form.amountWords || autoWords,
                chequeNumber: form.chequeNumber,
                orientation: form.orientation,
                offsetXmm: form.offsetXmm,
                offsetYmm: form.offsetYmm,
              };
              alert("Save to history (TODO: implement API)");
            }}
          >
            Save to history
          </button>
        </div>
      </aside>

      <section className="cheque-print-root overflow-auto rounded-xl border bg-slate-200 p-8 flex justify-center items-start">
        <div className="shadow-2xl">
          <ChequePrintLayout
            ref={printRef}
            payeeName={form.payeeName || "—"}
            chequeDate={new Date(form.chequeDate)}
            amountFigure={numericAmount}
            amountWords={form.amountWords || autoWords || "—"}
            chequeNumber={form.chequeNumber}
            orientation={form.orientation}
            offsetXmm={form.offsetXmm}
            offsetYmm={form.offsetYmm}
            language={form.language}
            accountPayeeOnly={form.accountPayeeOnly}
            memo={form.memo}
          />
        </div>
      </section>
    </div>
  );
}
