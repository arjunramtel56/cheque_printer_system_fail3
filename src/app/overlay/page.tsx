import type { Metadata } from "next";
import ChequeOverlayWorkspace from "@/components/cheque/ChequeOverlayWorkspace";

export const metadata: Metadata = {
  title: "Cheque Overlay Print — Reactify",
  description:
    "Upload a cheque photo, enter details, and print an overlay with precise field positioning.",
};

/**
 * Standalone cheque overlay print tool.
 *
 * Users upload their own cheque photo and manually position text fields
 * (payee, date, amount, amount-in-words) by dragging on a live preview.
 * Templates can be saved to / loaded from localStorage.
 */
export default function OverlayPage() {
  return <ChequeOverlayWorkspace />;
}
