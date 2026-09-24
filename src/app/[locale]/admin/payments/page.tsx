"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Eye, RefreshCw, Search, Filter } from "lucide-react";
import { useToast } from "@/providers/toast-provider";

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
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  plan: {
    name: string;
    description: string | null;
    price: string;
    chequeLimit: number;
  };
}

const STATUS_OPTIONS = [
  { value: "", labelKey: "all" },
  { value: "PENDING_VERIFICATION", labelKey: "pending" },
  { value: "APPROVED", labelKey: "approved" },
  { value: "REJECTED", labelKey: "rejected" },
];

const getStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

export default function AdminPaymentsPage() {
  const t = useTranslations("admin_payments");
  const locale = useLocale();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING_VERIFICATION");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  async function fetchPayments() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching payments:", error);
      showToast("Failed to load payments", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReview(payment: Payment) {
    setSelectedPayment(payment);
    setRejectionReason("");
    setReviewDialogOpen(true);
  }

  async function handleApprove() {
    if (!selectedPayment) return;

    if (
      !confirm(
        `Approve payment from ${selectedPayment.user.name} for ${selectedPayment.amount} ${selectedPayment.currency}?`
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPayment.id,
          status: "APPROVED",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve payment");
      }

      showToast("Payment approved and subscription activated", "success");
      setReviewDialogOpen(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      showToast(error.message || "Failed to approve payment", "error");
    }
  }

  async function handleReject() {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      showToast("Please enter a rejection reason", "error");
      return;
    }

    if (!confirm(`Reject payment from ${selectedPayment.user.name}?`)) return;

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPayment.id,
          status: "REJECTED",
          rejectionReason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject payment");
      }

      showToast("Payment rejected", "success");
      setReviewDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason("");
      fetchPayments();
    } catch (error: any) {
      showToast(error.message || "Failed to reject payment", "error");
    }
  }

  const filteredPayments = searchQuery
    ? payments.filter(
        (p) =>
          p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : payments;

  const getHeaderTitle = () => {
    if (filterStatus === "PENDING_VERIFICATION") return t("pendingPayments");
    if (filterStatus === "APPROVED") return t("allPayments");
    if (filterStatus === "REJECTED") return t("allPayments");
    return t("allPayments");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {t("title")} ({total} {t("total")})
        </h2>
        <Button variant="outline" size="sm" onClick={fetchPayments}>
          <RefreshCw size={16} className="mr-2" />
          {t("refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="statusFilter">{t("status")}</Label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value === "" ? t("all") : t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="search">
                {t("search") !== t("searchPlaceholder") ? t("search") : t("search")}
              </Label>
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("search")}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                <Filter size={16} className="mr-2" />
                {t("clearSearch")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{getHeaderTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center">
              <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noPayments")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("noPaymentsDesc")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("user")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("plan")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("amount")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("method")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("duration")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("date")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{payment.user.name}</p>
                          <p className="text-xs text-muted-foreground">{payment.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{payment.plan.name}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(payment.amount).toLocaleString()} {payment.currency}
                      </td>
                      <td className="px-4 py-3">{payment.paymentMethod}</td>
                      <td className="px-4 py-3 text-center">
                        {payment.durationMonths} {t("months")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {t(
                            payment.status.toLowerCase() as
                              "pending_verification" | "approved" | "rejected"
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(payment.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleReview(payment)}>
                            <Eye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("reviewPayment")}</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("user")}</Label>
                  <p className="font-medium">{selectedPayment.user.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("role")}: {selectedPayment.user.role}
                  </p>
                </div>
                <div>
                  <Label>{t("plan")}</Label>
                  <p className="font-medium">{selectedPayment.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayment.plan.description || t("noDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("amount")}</Label>
                  <p className="font-medium">
                    {Number(selectedPayment.amount).toLocaleString()} {selectedPayment.currency}
                  </p>
                </div>
                <div>
                  <Label>{t("method")}</Label>
                  <p className="font-medium">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <Label>{t("duration")}</Label>
                  <p className="font-medium">
                    {selectedPayment.durationMonths} {t("months")}
                  </p>
                </div>
                <div>
                  <Label>{t("submitted")}</Label>
                  <p className="font-medium text-sm">
                    {new Date(selectedPayment.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedPayment.reference && (
                <div>
                  <Label>{t("reference")}</Label>
                  <p className="text-sm">{selectedPayment.reference}</p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <Label>{t("notes")}</Label>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}

              {selectedPayment.proofUrl && (
                <div>
                  <Label>{t("paymentProof")}</Label>
                  <div className="mt-2">
                    <img
                      src={selectedPayment.proofUrl}
                      alt={t("paymentProof")}
                      className="max-w-full rounded-lg border"
                      style={{ maxHeight: "300px", objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}

              {selectedPayment.reviewer && (
                <div>
                  <Label>{t("reviewed")}</Label>
                  <p className="text-sm">
                    {selectedPayment.reviewer.name} ({selectedPayment.reviewer.email})
                  </p>
                </div>
              )}

              {selectedPayment.status === "PENDING_VERIFICATION" && (
                <div>
                  <Label htmlFor="rejectionReason">{t("rejectionReason")}</Label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t("enterReason")}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Link href={`/${locale}/admin/payments`}>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                {t("cancel")}
              </Button>
            </Link>
            {selectedPayment?.status === "PENDING_VERIFICATION" && (
              <>
                <Button variant="destructive" onClick={handleReject}>
                  <X size={16} className="mr-2" />
                  {t("reject")}
                </Button>
                <Button onClick={handleApprove}>
                  <Check size={16} className="mr-2" />
                  {t("approve")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
