"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Check, X, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";

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
  plan: {
    name: string;
    description: string | null;
    price: string;
    chequeLimit: number;
  };
}

const statusInfo: Record<
  PaymentStatus,
  { label: string; color: string; icon: any; description: string }
> = {
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    description: "Your payment is awaiting admin review. This typically takes 1-2 business days.",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: Check,
    description: "Your payment has been verified and your subscription is now active.",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: X,
    description: "Your payment was rejected. Please review the reason and submit a new payment.",
  },
};

export default function UserPaymentsPage() {
  const t = useTranslations("paymentStatus");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Link href="/en/dashboard/subscription">
          <Button variant="outline" size="sm">
            Back to Subscription
          </Button>
        </Link>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No payments submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't submitted any payments yet.
            </p>
            <Link href="/en/dashboard/subscription">
              <Button className="mt-4">Upgrade Subscription</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const info = statusInfo[payment.status];
            const Icon = info.icon;

            return (
              <Card key={payment.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon size={20} />
                      <span>{info.label}</span>
                    </span>
                    <span
                      className={`text-xs font-medium ${info.color.replace("bg-", "bg-").replace("text-", "text-")}`}
                    >
                      {new Date(payment.submittedAt).toLocaleDateString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Plan</p>
                      <p className="text-sm text-muted-foreground">{payment.plan.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Amount</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(payment.amount).toLocaleString()} {payment.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.durationMonths}{" "}
                          {payment.durationMonths === 1 ? "month" : "months"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-sm text-muted-foreground">{payment.paymentMethod}</p>
                    </div>

                    {payment.reference && (
                      <div>
                        <p className="text-sm font-medium">Reference</p>
                        <p className="text-sm text-muted-foreground">{payment.reference}</p>
                      </div>
                    )}

                    {payment.notes && (
                      <div>
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{payment.notes}</p>
                      </div>
                    )}

                    {payment.proofUrl && (
                      <div>
                        <p className="text-sm font-medium">Payment Proof</p>
                        <img
                          src={payment.proofUrl}
                          alt="Payment proof"
                          className="mt-1 max-w-xs rounded-lg border"
                          style={{ maxHeight: "200px", objectFit: "contain" }}
                        />
                      </div>
                    )}

                    {payment.rejectionReason && (
                      <div className="rounded-lg bg-red-50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5 text-red-600" />
                          <div>
                            <p className="font-medium text-sm text-red-800">Rejection Reason</p>
                            <p className="text-sm text-red-700">{payment.rejectionReason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <p className={`text-sm ${info.color.replace("bg-", "bg-")}`}>
                        {info.description}
                      </p>
                      {payment.reviewedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed on {new Date(payment.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
