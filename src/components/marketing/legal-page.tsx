"use client";

import { useTranslations } from "next-intl";
import { siteConfig } from "@/lib/config";

/**
 * Shared shell for /privacy-policy, /terms-of-service, /refund-policy.
 * Reads content keys from the "legal" namespace: ${doc}Title,
 * ${doc}Intro plus numbered sections.
 */
export function LegalPage({ doc }: { doc: "privacy" | "terms" | "refund" }) {
  const t = useTranslations("legal");

  const privacySections = [
    {
      titleKey: "privacyWeCollectTitle",
      bodyKeys: ["privacyWeCollect1", "privacyWeCollect2", "privacyWeCollect3"],
    },
    { titleKey: "privacyWeDoTitle", bodyKeys: ["privacyWeDo1", "privacyWeDo2", "privacyWeDo3"] },
  ];

  const termsSections = [
    { titleKey: "termsUseTitle", bodyKeys: ["termsUse1", "termsUse2", "termsUse3"] },
    { titleKey: "termsSubTitle", bodyKeys: ["termsSub1", "termsSub2", "termsSub3"] },
  ];

  const refundBodies = ["refund1", "refund2", "refund3", "refund4"];

  const title = t(`${doc}Title`);
  const intro = t(`${doc}Intro`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">{t("updated")}</p>
      <p className="mt-6 text-muted-foreground">{intro}</p>

      {doc === "privacy" && (
        <div className="mt-8 space-y-8">
          {privacySections.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-lg font-semibold">{t(section.titleKey)}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {section.bodyKeys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h2 className="text-lg font-semibold">{t("privacyContactTitle")}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("privacyContactBody", { email: siteConfig.contact.email })}
            </p>
          </section>
        </div>
      )}

      {doc === "terms" && (
        <div className="mt-8 space-y-8">
          {termsSections.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-lg font-semibold">{t(section.titleKey)}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {section.bodyKeys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h2 className="text-lg font-semibold">{t("termsLiabilityTitle")}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{t("termsLiabilityBody")}</p>
          </section>
        </div>
      )}

      {doc === "refund" && (
        <ul className="mt-8 list-disc space-y-3 pl-5 text-sm text-muted-foreground">
          {refundBodies.map((key) => (
            <li key={key}>{t(key, { email: siteConfig.contact.email })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
