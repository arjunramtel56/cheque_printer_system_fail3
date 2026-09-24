"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Upload, Check, AlertTriangle, Clock, X, FileText } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { useToast } from "@/providers/toast-provider";
import Link from "next/link";

const DURATION_OPTIONS = [
  { value: "1", labelKey: "duration1Month" },
  { value: "3", labelKey: "duration3Months" },
  { value: "6", labelKey: "duration6Months" },
  { value: "12", labelKey: "duration12Months" },
];

interface TrialInfo {
  isActive: boolean;
  trialExpires: string | null;
  daysLeft: number;
  printsUsed: number;
  printsLeft: number;
  chequeLimit: number;
  isExpired: boolean;
  plan: {
    name: string;
    description: string | null;
    chequeLimit: number;
    features: any;
  } | null;
  subscriptionActive: boolean;
}

type PaymentStatus = "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";

interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  durationMonths: number;
  proofUrl: string | null;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  reviewer: { id: string; name: string; email: string } | null;
  plan: {
    name: string;
    description: string | null;
    price: string;
    chequeLimit: number;
  };
}

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "business" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPayments, setMyPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetchTrialInfo();
    fetchMyPayments();
  }, []);

  async function fetchTrialInfo() {
    try {
      const res = await fetch("/api/trial");
      if (!res.ok) throw new Error("Failed to fetch trial info");
      const data = await res.json();
      setTrialInfo(data);
    } catch (error) {
      console.error("Error fetching trial info:", error);
      showToast("Failed to load subscription info.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyPayments() {
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setMyPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }

  const pricing = siteConfig.pricing;

  function handleSelectPlan(plan: "standard" | "business") {
    setSelectedPlan(plan);
    setPaymentStatus("idle");
    setUploadedFile(null);
    setReference("");
    setNotes("");
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

    if (!reference.trim()) {
      showToast("Please provide a transaction reference or details.", "error");
      return;
    }

    setPaymentStatus("submitting");

    try {
      const formData = new FormData();
      formData.append("proof", uploadedFile);
      formData.append("plan", selectedPlan);
      formData.append("duration", selectedDuration);
      formData.append("paymentMethod", "FONEPAY");
      formData.append("reference", reference);
      formData.append("notes", notes);
      formData.append("amount", getPayAmount(selectedPlan).replace("NPR ", ""));
      formData.append("currency", "NPR");

      const res = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Submission failed");

      setPaymentStatus("submitted");
      showToast("Payment proof submitted. Waiting for admin approval.", "success");
      setUploadedFile(null);
      setReference("");
      setNotes("");
      fetchMyPayments();
    } catch (err) {
      showToast("Failed to submit payment. Try again.", "error");
    } finally {
      setPaymentStatus("idle");
    }
  }

  const payAmount = selectedPlan ? getPayAmount(selectedPlan) : "";

  const getStatusDisplay = (payment: Payment) => {
    const statusMap: Record<PaymentStatus, { label: string; color: string; icon: any }> = {
      PENDING_VERIFICATION: {
        label: "Pending Verification",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      APPROVED: {
        label: "Approved",
        color: "bg-green-100 text-green-800",
        icon: Check,
      },
      REJECTED: {
        label: "Rejected",
        color: "bg-red-100 text-red-800",
        icon: X,
      },
    };

    const info = statusMap[payment.status];
    const Icon = info.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${info.color}`}
      >
        <Icon size={12} />
        {info.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="text-center py-8 text-muted-foreground">Loading subscription info...</div>
      </div>
    );
  }

  const isTrial = trialInfo?.isExpired === false;
  const latestPendingPayment = myPayments.find((p) => p.status === "PENDING_VERIFICATION");
  const latestApprovedPayment = myPayments.find((p) => p.status === "APPROVED");
  const latestRejectedPayment = myPayments.find((p) => p.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Link href={`/${locale}/dashboard/subscription/payments`}>
          <Button variant="outline" size="sm">
            <FileText size={16} className="mr-2" />
            {t("viewMyPayments")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
        </CardHeader>
        <CardContent>
          {trialInfo?.isExpired && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold">Your trial period has expired.</p>
                  <p className="mt-1">
                    Please upgrade your subscription to continue using the service.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">{t("freeTrial")}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {trialInfo?.daysLeft ?? 0}{" "}
                  {t("trialDaysLeft", { days: trialInfo?.daysLeft ?? 0 })}
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
              <p className="text-sm text-muted-foreground">{t("chequesPrinted")}</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{trialInfo?.daysLeft ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("trialDaysLeft", { days: 0 })}</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{trialInfo?.printsLeft ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("chequesPrinted")}</p>
            </div>
          </div>

          {trialInfo &&
            !trialInfo.isExpired &&
            trialInfo.daysLeft <= 7 &&
            trialInfo.daysLeft > 0 && (
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
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    {pricing.standard.firstMonth} {t("firstMonth")}
                  </p>
                  <p className="mt-1">
                    {t("regularPricing")} {pricing.standard.threeMonths} (3 {t("duration3Months")}),{" "}
                    {pricing.standard.sixMonths} (6 {t("duration6Months")}),{" "}
                    {pricing.standard.annual} (12 {t("duration12Months")})
                  </p>
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
                    {t("bestValue")}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{pricing.business.label}</p>
                  {selectedPlan === "business" && <Check className="h-5 w-5 text-blue-600" />}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">
                    {pricing.business.firstMonth} {t("firstMonth")}
                  </p>
                  <p className="mt-1">
                    {t("regularPricing")} {pricing.business.threeMonths} (3 {t("duration3Months")}),{" "}
                    {pricing.business.sixMonths} (6 {t("duration6Months")}),{" "}
                    {pricing.business.annual} (12 {t("duration12Months")})
                  </p>
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
          {latestPendingPayment && (
            <div className="mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 text-sm text-yellow-700 dark:text-yellow-300 w-full">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span>{t("paymentSubmitted")}</span>
              </div>
              <p className="mt-1">
                Submitted on {new Date(latestPendingPayment.submittedAt).toLocaleString()} -
                awaiting admin review.
              </p>
            </div>
          )}

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
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("amountToPay")}: <span className="font-bold text-lg">{payAmount}</span>
                </p>
                {selectedDuration === "1" && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {t("introductoryOffer")}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("merchant")}: {pricing.fonepay.merchantName}
              </p>

              <div className="w-full mt-6">
                <Label
                  htmlFor="reference"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  {t("transactionReference")} *
                </Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t("transactionReferencePlaceholder")}
                  disabled={paymentStatus === "submitting" || !!latestPendingPayment}
                />
              </div>

              <div className="w-full mt-4">
                <Label
                  htmlFor="notes"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  {t("additionalNotes")}
                </Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  disabled={paymentStatus === "submitting" || !!latestPendingPayment}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div className="w-full mt-4">
                <Label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("uploadPaymentProof")} *
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  disabled={paymentStatus === "submitting" || !!latestPendingPayment}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-blue-300"
                />
              </div>

              {latestRejectedPayment && (
                <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                  <p className="font-semibold">Your last payment was rejected.</p>
                  {latestRejectedPayment.rejectionReason && (
                    <p>Reason: {latestRejectedPayment.rejectionReason}</p>
                  )}
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleFonepaySubmit}
                disabled={
                  paymentStatus === "submitting" ||
                  !uploadedFile ||
                  !reference.trim() ||
                  !!latestPendingPayment
                }
              >
                {paymentStatus === "submitting" ? "Submitting..." : t("submitPayment")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("selectPlanUnlock")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
