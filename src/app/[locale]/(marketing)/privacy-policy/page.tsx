import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Reactify Cheque Printer System",
};

export default function PrivacyPolicyPage() {
  return <LegalPage doc="privacy" />;
}
