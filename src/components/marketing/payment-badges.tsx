"use client";

import { useTranslations } from "next-intl";
import { CreditCard, Landmark, QrCode, Smartphone } from "lucide-react";

const METHODS = [
  { name: "Fonepay QR", icon: QrCode },
  { name: "eSewa", icon: Smartphone },
  { name: "Khalti", icon: Smartphone },
  { name: "ConnectIPS", icon: Landmark },
  { name: "Bank transfer", icon: CreditCard },
];

export function PaymentBadges() {
  const t = useTranslations("footer");

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("paymentsAccepted")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {METHODS.map(({ name, icon: Icon }) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
