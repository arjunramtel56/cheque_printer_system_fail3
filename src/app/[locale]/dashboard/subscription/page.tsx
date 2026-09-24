"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload, Check, AlertTriangle } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { useToast } from "@/providers/toast-provider";

const DURATION_OPTIONS = [
  { value: "1", labelKey: "duration1Month" },
  { value: "3", labelKey: "duration3Months" },
  { value: "6", labelKey: "duration6Months" },
  { value: "12", labelKey: "duration12Months" },
];

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const tDashboard = useTranslations("dashboard_ui");
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "business" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "submitting" | "pending">("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [trialInfo, setTrialInfo] = useState({ daysLeft: 14, printsLeft: 8 });

  useEffect(() => {
    const stored = localStorage.getItem("trialInfo");
    if (stored) {
      setTrialInfo(JSON.parse(stored));
    }
  }, []);

  const pricing = siteConfig.pricing;

  function handleSelectPlan(plan: "standard" | "business") {
    setSelectedPlan(plan);
  }

  function getPayAmount(plan: "standard" | "business"): string {
    const data = plan === "business" ? pricing.business : pricing.standard;
    const durationMap = {
      "1": data.firstMonth,
      "3": data.threeMonths,
      "6": data.sixMonths,
      "12": data.annual,
    };
    return durationMap[selectedDuration as keyof typeof durationMap];
  }

  async function handleFonepaySubmit() {
    if (!selectedPlan) {
      showToast("Please select a plan first.", "error");
      return;
    }

    if (!uploadedFile) {
      showToast("Please upload your payment proof screenshot.", "error");
      return;
    }

    setPaymentStatus("submitting");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("plan", selectedPlan);
      formData.append("duration", selectedDuration);

      const res = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Submission failed");

      setPaymentStatus("pending");
      showToast("Payment proof submitted. Waiting for admin approval.", "success");
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          plan: selectedPlan,
          duration: selectedDuration,
          date: new Date().toISOString(),
        })
      );
    } catch {
      showToast("Failed to submit payment. Try again.", "error");
    } finally {
      setPaymentStatus("idle");
    }
  }

  const payAmount = selectedPlan ? getPayAmount(selectedPlan) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">{t("freeTrial")}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {trialInfo.daysLeft} {t("trialDaysLeft", { days: trialInfo.daysLeft })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {t("active")}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{pricing.trial.features[0].split(" ")[0]}</p>
              <p className="text-sm text-muted-foreground">{tDashboard("stats.chequesPrinted")}</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{trialInfo.daysLeft}</p>
              <p className="text-sm text-muted-foreground">{tDashboard("stats.trialDaysLeft")}</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{trialInfo.printsLeft}</p>
              <p className="text-sm text-muted-foreground">{t("chequesPrinted")}</p>
            </div>
          </div>

          {trialInfo.daysLeft <= 7 && trialInfo.daysLeft > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <p>
                  Your trial period ends in {trialInfo.daysLeft} day
                  {trialInfo.daysLeft !== 1 ? "s" : ""}. Upgrade now to continue without
                  interruption.
                </p>
              </div>
            </div>
          )}

          {trialInfo.daysLeft <= 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                <p>Your trial period has expired. Please upgrade your subscription to continue.</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-3 font-semibold">{t("selectPlan")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={`rounded-lg border p-4 cursor-pointer transition-all ${
                  selectedPlan === "standard"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                }`}
                onClick={() => handleSelectPlan("standard")}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{pricing.standard.label}</p>
                  {selectedPlan === "standard" && <Check className="h-5 w-5 text-blue-600" />}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <p>First Month: {pricing.standard.firstMonth}</p>
                  <div className="mt-1 space-y-1">
                    {pricing.standard.features.map((f) => (
                      <p key={f}>• {f}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-lg border-2 p-4 cursor-pointer transition-all relative ${
                  selectedPlan === "business"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-yellow-400 hover:border-yellow-500"
                }`}
                onClick={() => handleSelectPlan("business")}
              >
                {pricing.business.bestValue && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-xs font-bold px-2 py-0.5 rounded">
                    BEST VALUE
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{pricing.business.label}</p>
                  {selectedPlan === "business" && <Check className="h-5 w-5 text-blue-600" />}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <p>First Month: {pricing.business.firstMonth}</p>
                  <div className="mt-1 space-y-1">
                    {pricing.business.features.map((f) => (
                      <p key={f}>• {f}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("payWithFonepay")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center">
          {selectedPlan ? (
            <>
              <h4 className="font-semibold mb-3">{t("duration")}</h4>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full max-w-xs border rounded-lg px-3 py-2 mb-6 dark:bg-slate-700 dark:text-white"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t("scanQR")}</p>
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 shadow-sm mb-6">
                <img
                  src={pricing.fonepay.qrCodeUrl}
                  alt="Fonepay QR Code"
                  className="w-48 h-48 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<div class="w-48 h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs">QR Code Placeholder</div>';
                  }}
                />
              </div>
              <p className="text-sm mb-2">
                <span className="font-medium">{t("amountToPay")}</span> {payAmount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("merchant")}: {pricing.fonepay.merchantName}
              </p>

              <div className="w-full mt-6">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("uploadPaymentProof")}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-blue-300"
                />
              </div>

              {paymentStatus === "pending" && (
                <div className="w-full mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
                  {t("paymentSubmitted")}
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleFonepaySubmit}
                disabled={paymentStatus === "submitting" || !uploadedFile}
              >
                {paymentStatus === "submitting" ? "Submitting..." : t("submitPayment")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("selectPlan")} {t("freeTrial").toLowerCase()} to unlock payment options.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
