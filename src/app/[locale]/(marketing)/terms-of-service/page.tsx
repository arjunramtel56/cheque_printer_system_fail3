import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Reactify Cheque Printer System",
};

export default function TermsOfServicePage() {
  return <LegalPage doc="terms" />;
}
