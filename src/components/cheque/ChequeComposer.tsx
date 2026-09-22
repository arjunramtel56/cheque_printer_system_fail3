"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChequePrintLayout } from "./ChequePrintLayout";
import { amountToWords } from "@/lib/amount-to-words";
import { chequeSchema } from "@/lib/cheque/schema";

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
};

export function ChequeComposer() {
  const t = useTranslations("cheque");
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();

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
  });

  const numericAmount = useMemo(() => Number(form.amountFigure) || 0, [form.amountFigure]);

  const autoWords = useMemo(
    () => (numericAmount > 0 ? amountToWords(numericAmount, form.language) : ""),
    [numericAmount, form.language]
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSave(status: "DRAFT" | "READY") {
    const payload = {
      payeeName: form.payeeName,
      chequeDate: form.chequeDate,
      amountFigure: form.amountFigure,
      amountWords: form.amountWords || autoWords,
      chequeNumber: form.chequeNumber,
      orientation: form.orientation,
      offsetXmm: form.offsetXmm,
      offsetYmm: form.offsetYmm,
      status,
    };

    const parsed = chequeSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid data";
      alert(firstError);
      return;
    }

    start(async () => {
      try {
        const res = await fetch("/api/cheques", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: "default-template",
            payeeName: parsed.data.payeeName,
            chequeDate: new Date(parsed.data.chequeDate).toISOString(),
            amountNumber: parsed.data.amountFigure,
            amountWords: parsed.data.amountWords,
            chequeNumber: parsed.data.chequeNumber || undefined,
            accountHolder: parsed.data.payeeName,
            orientation: parsed.data.orientation,
            offsetXmm: parsed.data.offsetXmm,
            offsetYmm: parsed.data.offsetYmm,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to save");
          return;
        }

        const data = await res.json();
        router.push(`/dashboard/cheques/${data.id}`);
      } catch (err) {
        alert("An unexpected error occurred");
      }
    });
  }

  function handlePrint() {
    document.documentElement.classList.remove("dark");
    window.print();
  }

  const canPrint = !!form.payeeName && numericAmount > 0;

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[380px_1fr]">
      <aside className="no-print space-y-4 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{t("formTitle")}</h2>

        <label className="block text-sm">
          {t("payeeName")}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.payeeName}
            onChange={(e) => update("payeeName", e.target.value)}
            placeholder="Rahul Sharma"
            maxLength={100}
          />
        </label>

        <label className="block text-sm">
          {t("chequeDate")}
          <input
            type="date"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.chequeDate}
            onChange={(e) => update("chequeDate", e.target.value)}
          />
        </label>

        <label className="block text-sm">
          {t("amountFigure")}
          <div className="mt-1 flex overflow-hidden rounded border">
            <span className="flex items-center border-r px-3 py-2 text-sm font-medium text-slate-500">
              Rs.
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="min-w-0 flex-1 border-0 px-3 py-2 outline-none"
              value={form.amountFigure}
              onChange={(e) => update("amountFigure", e.target.value)}
              placeholder="125000.50"
            />
          </div>
        </label>

        <label className="block text-sm">
          {t("amountWords")}
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
            value={form.amountWords || autoWords}
            onChange={(e) => update("amountWords", e.target.value)}
            placeholder={autoWords}
          />
          <button
            type="button"
            className="mt-1 text-xs text-blue-600 hover:underline"
            onClick={() => update("amountWords", autoWords)}
          >
            {t("useAuto")}
          </button>
        </label>

        <label className="block text-sm">
          {t("chequeNumber")}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.chequeNumber}
            onChange={(e) => update("chequeNumber", e.target.value)}
            maxLength={20}
            placeholder={t("chequeNumberPlaceholder")}
          />
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

        <details className="text-sm">
          <summary className="cursor-pointer">{t("fineTune")}</summary>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label>
              X offset (mm)
              <input
                type="number"
                step="0.5"
                className="mt-1 w-full rounded border px-2 py-1"
                value={form.offsetXmm}
                onChange={(e) => update("offsetXmm", Number(e.target.value))}
              />
            </label>
            <label>
              Y offset (mm)
              <input
                type="number"
                step="0.5"
                className="mt-1 w-full rounded border px-2 py-1"
                value={form.offsetYmm}
                onChange={(e) => update("offsetYmm", Number(e.target.value))}
              />
            </label>
          </div>
        </details>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
            onClick={handlePrint}
            disabled={!canPrint}
          >
            {t("print")}
          </button>
          <button
            className="rounded border px-3 py-2"
            onClick={() => handleSave("DRAFT")}
            disabled={pending || !form.payeeName || !numericAmount}
          >
            {t("saveDraft")}
          </button>
        </div>
      </aside>

      <section className="cheque-print-root overflow-auto rounded-xl border bg-slate-100 p-4">
        <div
          className="mx-auto"
          style={{
            transform: "scale(0.72)",
            transformOrigin: "top left",
          }}
        >
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
          />
        </div>
      </section>
    </div>
  );
}
