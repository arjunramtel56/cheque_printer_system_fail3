"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const [amount, setAmount] = useState<string>(t("demoDefaultAmount"));

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
        {/* Mini cheque leaf — proportions match the real 190.5 × 88.9 mm layout */}
        <div className="relative w-full overflow-hidden rounded-md border-2 border-slate-300 bg-white shadow-inner dark:border-slate-500">
          <div className="aspect-[190.5/88.9] w-full p-[4%] font-mono text-slate-800">
            {/* Bank name */}
            <div className="mb-[2%] text-[clamp(6px,1.6vw,10px)] font-bold uppercase tracking-wide text-slate-500">
              Your Bank Ltd.
            </div>
            {/* Date row: 8 digit boxes at top right, like the real layout */}
            <div className="flex justify-end gap-[1.5%]">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[clamp(6px,1.4vw,9px)] w-[clamp(6px,1.8vw,11px)] rounded-[1px] border border-slate-400"
                />
              ))}
            </div>
            {/* Payee line */}
            <div className="mt-[6%] flex items-end gap-[2%]">
              <span className="text-[clamp(5px,1.3vw,9px)] text-slate-500">Pay</span>
              <div className="h-[clamp(8px,2vw,13px)] flex-1 border-b border-slate-300" />
            </div>
            {/* Amount in words line */}
            <div className="mt-[4%] flex items-end gap-[2%]">
              <span className="whitespace-nowrap text-[clamp(5px,1.3vw,9px)] text-slate-500">
                Rs.
              </span>
              <div className="flex-1 truncate border-b border-slate-300 pb-[1px] text-[clamp(6px,1.5vw,10px)] text-slate-800">
                {words ?? "—"}
              </div>
            </div>
            {/* Amount figure box, right aligned */}
            <div className="mt-[4%] flex justify-end">
              <div
                className={`${boxWidthClass} rounded-[2px] border border-slate-400 px-2 py-[2px] text-right text-[clamp(7px,1.8vw,12px)] font-semibold text-slate-900`}
              >
                {formatted ?? "—"}
              </div>
            </div>
            {/* A/C PAYEE crossing */}
            <div className="mt-[4%] flex justify-center">
              <div className="border-y-2 border-slate-500 px-[6%] py-[1px] text-[clamp(5px,1.2vw,8px)] font-bold uppercase tracking-widest text-slate-600">
                A/C Payee
              </div>
            </div>
          </div>
        </div>
        {words ? (
          <p className="mt-2 text-xs text-muted-foreground">{words}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">&nbsp;</p>
        )}
      </div>
    </div>
  );
}
