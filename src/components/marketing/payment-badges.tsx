"use client";

import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";

/**
 * Payment method badges. Only Fonepay QR is actually implemented end-to-end
 * (QR + payment-proof upload + admin verification), so only Fonepay is shown.
 */
export function PaymentBadges() {
  const t = useTranslations("footer");

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("paymentsAccepted")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <QrCode className="h-3.5 w-3.5" />
          Fonepay QR
        </span>
      </div>
    </div>
  );
}
