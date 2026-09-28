import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy — Reactify Cheque Printer System",
};

export default function RefundPolicyPage() {
  return <LegalPage doc="refund" />;
}
