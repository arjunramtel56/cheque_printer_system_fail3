"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { amountToWords, formatAmount } from "@/lib/amount-to-words";

/**
 * Interactive marketing demo: type an amount, see amount-in-words and a
 * mini cheque-leaf preview. Uses the same formatters as the real printing
 * pipeline so what visitors see is what they will get.
 */
export function DemoChequePreview({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [amount, setAmount] = useState<string>(t("demoDefaultAmount"));

  /**
   * Demo-leaf date — the real current date, set after mount so SSR and client
   * renders match (no hydration mismatch) and so it follows the visitor's
   * clock, rolling over automatically at midnight. Rendered as
   * DD / MM / YYYY digits to mirror the DAY/MONTH/YEAR boxes on Nepalese
   * cheque leaves.
   */
  const [dateDigits, setDateDigits] = useState<string[] | null>(null);
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const apply = () => {
      const now = new Date();
      setDateDigits([pad(now.getDate()), pad(now.getMonth() + 1), String(now.getFullYear())]);
    };
    apply();
    const msUntilMidnight = new Date(new Date().setHours(24, 0, 0, 0)).getTime() - Date.now();
    const timer = window.setInterval(apply, msUntilMidnight + 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabels = useMemo(
    () =>
      locale === "ne"
        ? [t("demoDateDay"), t("demoDateMonth"), t("demoDateYear")]
        : ["DAY", "MONTH", "YEAR"],
    [locale, t]
  );

  const numericAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [amount]);

  const words = useMemo(() => {
    if (numericAmount == null) return null;
    try {
      return amountToWords(numericAmount, "en");
    } catch {
      return null;
    }
  }, [numericAmount]);

  const formatted = numericAmount != null ? formatAmount(numericAmount) : null;
  const boxWidthClass = compact ? "w-24" : "w-28";

  return (
    <div className="w-full">
      <label htmlFor="demo-amount" className="mb-2 block text-sm font-medium text-muted-foreground">
        {t("demoAmountLabel")}
      </label>
      <div className="flex gap-2">
        <Input
          id="demo-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="25000"
          className="h-10 text-base"
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={() => setAmount(t("demoDefaultAmount"))}>
          25000
        </Button>
      </div>

      <div className="mt-4 rounded-lg border bg-background p-3 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("demoLivePreview")}
        </p>
        {/* Mini cheque leaf — proportions match the real 190.5 × 88.9 mm layout.
            Purely a marketing visual: the real printing pipeline is untouched. */}
        <div className="relative w-full overflow-hidden rounded-md border border-[#e7ddc8] bg-[#fdf8ec] shadow-inner">
          {/* Diagonal demo watermark — mirrors the "DEMO" branding used across marketing */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] select-none whitespace-nowrap text-[clamp(11px,2.6vw,20px)] font-extrabold uppercase tracking-widest text-[#8a8371]/20"
          >
            DEMO — NOT VALID FOR PAYMENT
          </div>
          <div className="aspect-[190.5/88.9] w-full p-[4%] text-[#1f2937]">
            {/* Header row: bank identity left, date boxes right */}
            <div className="flex items-start justify-between gap-[3%]">
              <div className="min-w-0">
                <div className="text-[clamp(7px,1.7vw,12px)] font-extrabold uppercase leading-tight tracking-wide text-[#334155]">
                  {t("demoBankName")}
                </div>
                <div className="mt-[2px] text-[clamp(5px,1.2vw,9px)] uppercase tracking-[0.18em] text-[#64748b]">
                  {t("demoBankBranch")}
                </div>
              </div>
              {/* Date: label + DAY / MONTH / YEAR digit boxes filled with today's date */}
              <div className="flex shrink-0 items-start gap-[2%]">
                <div className="pt-[2px] text-right">
                  <div className="text-[clamp(6px,1.3vw,9px)] font-semibold text-[#334155]">
                    {t("demoDateLabel")}
                    <span className="ml-1 text-[clamp(4px,1vw,7px)] font-normal text-[#64748b]">
                      मिति
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <div className="flex gap-[3px]">
                    {[0, 1].map((i) => (
                      <div
                        key={`d${i}`}
                        className="flex h-[clamp(8px,1.8vw,13px)] w-[clamp(7px,1.6vw,12px)] items-center justify-center border border-[#94a3b8] bg-white text-[clamp(5px,1.2vw,9px)] font-semibold text-[#1f2937]"
                      >
                        {dateDigits?.[0]?.[i] ?? ""}
                      </div>
                    ))}
                    {[0, 1].map((i) => (
                      <div
                        key={`m${i}`}
                        className="flex h-[clamp(8px,1.8vw,13px)] w-[clamp(7px,1.6vw,12px)] items-center justify-center border border-[#94a3b8] bg-white text-[clamp(5px,1.2vw,9px)] font-semibold text-[#1f2937]"
                      >
                        {dateDigits?.[1]?.[i] ?? ""}
                      </div>
                    ))}
                    {dateDigits?.[2]?.split("").map((digit, i) => (
                      <div
                        key={`y${i}`}
                        className="flex h-[clamp(8px,1.8vw,13px)] w-[clamp(7px,1.6vw,12px)] items-center justify-center border border-[#94a3b8] bg-white text-[clamp(5px,1.2vw,9px)] font-semibold text-[#1f2937]"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-[3px] text-center text-[clamp(4px,0.95vw,7px)] uppercase tracking-wide text-[#64748b]">
                    <span className="w-[clamp(14px,3.2vw,24px)]">{dateLabels[0]}</span>
                    <span className="w-[clamp(14px,3.2vw,24px)]">{dateLabels[1]}</span>
                    <span className="w-[clamp(21px,4.8vw,36px)]">{dateLabels[2]}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* A/C PAYEE crossing — left-aligned, like Nepalese leaves */}
            <div className="mt-[3%] flex">
              <div className="border-[2.5px] border-[#b91c1c] px-[5%] py-[1px] text-[clamp(6px,1.5vw,10px)] font-extrabold uppercase tracking-widest text-[#b91c1c]">
                A/C PAYEE
              </div>
            </div>
            {/* Payee line */}
            <div className="mt-[5%] flex items-end gap-[2%]">
              <span className="shrink-0 text-[clamp(5px,1.3vw,9px)] text-[#475569]">
                {t("demoPayLabel")}
              </span>
              <div className="flex-1 truncate border-b border-[#94a3b8] pb-[1px] text-[clamp(6px,1.5vw,10px)] font-medium text-[#1f2937]">
                {t("demoPayeeName")}
              </div>
              <span className="shrink-0 text-[clamp(5px,1.3vw,9px)] text-[#475569]">
                {t("demoOrBearer")}
              </span>
            </div>
            {/* Amount in words line — live from the same formatter as the real pipeline */}
            <div className="mt-[3%] flex items-end gap-[2%]">
              <span className="shrink-0 text-[clamp(5px,1.3vw,9px)] text-[#475569]">
                {t("demoSumLabel")}
              </span>
              <div className="flex-1 truncate border-b border-[#94a3b8] pb-[1px] text-[clamp(6px,1.5vw,10px)] font-semibold text-[#1f2937]">
                {words ?? "—"}
              </div>
            </div>
            {/* Bottom row: figure box left, signatures + number right */}
            <div className="mt-[4%] flex items-end justify-between gap-[3%]">
              <div
                className={`${boxWidthClass} rounded-[3px] border border-[#64748b] bg-white px-2 py-[2px] text-[clamp(7px,1.8vw,12px)] font-bold text-[#1f2937]`}
              >
                {formatted ? `NPR ${formatted}` : "—"}
              </div>
              <div className="flex items-end gap-[6%]">
                <div className="text-center">
                  <div className="mx-auto w-[clamp(36px,8vw,64px)] border-t border-[#64748b]" />
                  <div className="mt-[2px] text-[clamp(4px,0.95vw,7px)] uppercase tracking-wide text-[#64748b]">
                    {t("demoSignature")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[clamp(5px,1.2vw,9px)] uppercase tracking-wide text-[#475569]">
                    {t("demoNoLabel")}
                  </div>
                  <div className="text-[clamp(7px,1.7vw,12px)] font-bold tracking-wider text-[#1f2937]">
                    000001
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {words ? (
          <p className="mt-2 text-xs text-muted-foreground">{words}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">&nbsp;</p>
        )}
        {/* Demo-only disclaimer — mirrors the watermark on the leaf above */}
        <p className="mt-1 text-center text-xs italic text-muted-foreground">
          {t("demoDisclaimer")}
        </p>
      </div>
    </div>
  );
}
