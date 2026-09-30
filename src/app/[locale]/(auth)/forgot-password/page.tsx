"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/lib/config";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Forgot-password page. Calls POST /api/auth/forgot-password. The API
 * responds identically for known and unknown emails (no enumeration).
 *
 * The dev-only reset link comes back only outside production (the API has
 * no email infrastructure yet); in production builds it is never rendered.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  // The API only returns resetUrl outside production; this state stays
  // empty in production builds, so the link can never leak.
  const isProduction = process.env.NODE_ENV === "production";
  const [devResetUrl, setDevResetUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError(t("invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || t("somethingWentWrong"));
        setLoading(false);
        return;
      }

      if (!isProduction && data?.resetUrl) {
        setDevResetUrl(String(data.resetUrl));
      }
      setSubmitted(true);
    } catch {
      setError(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-10 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("forgotPasswordQuestion")}</CardTitle>
        <CardDescription>{t("enterEmail")}</CardDescription>
      </CardHeader>
      {submitted ? (
        <CardContent className="space-y-4 text-center">
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100"
          >
            {t("resetLinkSent")}
          </div>
          {!isProduction && devResetUrl ? (
            <p className="break-all text-xs text-muted-foreground">
              Development only — reset link:{" "}
              <a className="text-primary underline" href={devResetUrl}>
                {devResetUrl}
              </a>
            </p>
          ) : null}
          <Link href="/login">
            <Button variant="outline" className="w-full">
              {t("backToLogin")}
            </Button>
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : t("sendResetLink")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                {t("backToLogin")}
              </Link>
            </p>{" "}
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
