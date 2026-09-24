"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { siteConfig } from "@/lib/config";

type IconData = {
  icon: React.ElementType;
  titleKey: string;
  value: string;
  extra?: string;
};

const contactInfo: IconData[] = [
  {
    icon: Mail,
    titleKey: "email",
    value: siteConfig.contact.email,
  },
  {
    icon: Phone,
    titleKey: "phone",
    value: siteConfig.contact.phone,
  },
  {
    icon: MapPin,
    titleKey: "address",
    value: siteConfig.contact.address,
    extra: siteConfig.company,
  },
  {
    icon: Globe,
    titleKey: "website",
    value: siteConfig.contact.website,
    extra: "Official Website",
  },
];

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t("description")}</p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {contactInfo.map((info) => (
              <Card key={info.titleKey} className="border-0 shadow-sm">
                <CardContent className="pt-6 text-center">
                  <info.icon className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{t(info.titleKey)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{info.value}</p>
                  {info.extra && (
                    <p className="mt-1 text-xs text-muted-foreground/70">{info.extra}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-center">{t("formTitle")}</h2>
          <form className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                {t("formName")}
              </label>
              <input
                type="text"
                id="name"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("formNamePlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                {t("formEmail")}
              </label>
              <input
                type="email"
                id="email"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("formEmailPlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium">
                {t("formSubject")}
              </label>
              <input
                type="text"
                id="subject"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("formSubjectPlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium">
                {t("formMessage")}
              </label>
              <textarea
                id="message"
                rows={4}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("formMessagePlaceholder")}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("formSubmit")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
