"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/config";
import { Mail, Phone, MapPin, Globe, Send, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Public contact page.
 *
 * The form posts to POST /api/contact (server-side validation + rate
 * limiting; submissions are persisted as SupportTickets for the team).
 * Success/error copy reflects the real request outcome — never a fake
 * success.
 */
export default function ContactPage() {
  const t = useTranslations("contact");

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation (server remains the source of truth).
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError(t("formRequired"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError(t("formInvalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || t("formError"));
        return;
      }

      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError(t("formError"));
    } finally {
      setLoading(false);
    }
  }

  const contactCards = [
    {
      icon: Phone,
      label: t("phone"),
      value: siteConfig.contact.phone,
      href: `tel:${siteConfig.contact.phone.replace(/[^+\d]/g, "")}`,
    },
    {
      icon: Mail,
      label: t("email"),
      value: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
    },
    { icon: MapPin, label: t("address"), value: siteConfig.contact.address, href: null },
    {
      icon: Globe,
      label: t("website"),
      value: siteConfig.contact.website,
      href: `https://${siteConfig.contact.website}`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("description")}</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {contactCards.map((card) => (
          <div
            key={card.label}
            className="flex h-full flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            {card.href ? (
              <a
                href={card.href}
                className="break-all text-sm font-medium hover:text-primary hover:underline"
              >
                {card.value}
              </a>
            ) : (
              <p className="break-all text-sm font-medium">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-2xl font-bold text-center">{t("formTitle")}</h2>

        {success ? (
          <div
            role="status"
            className="mt-8 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-medium">{t("formSuccess")}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t("formName")} *</Label>
              <Input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={update("name")}
                placeholder={t("formNamePlaceholder")}
                required
                minLength={2}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t("formEmail")} *</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder={t("formEmailPlaceholder")}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">{t("formSubject")} *</Label>
              <Input
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={update("subject")}
                placeholder={t("formSubjectPlaceholder")}
                required
                minLength={3}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">{t("formMessage")} *</Label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={update("message")}
                placeholder={t("formMessagePlaceholder")}
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                disabled={loading}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? t("formSubmitting") : t("formSubmit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
