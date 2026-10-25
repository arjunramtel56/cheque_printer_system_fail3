"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
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
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
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
          <Alert variant="success" title={t("resetLinkSent")} />

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
            {error && <Alert variant="destructive" title={error} />}

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
                aria-required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  {t("sending")}
                </div>
              ) : (
                t("sendResetLink")
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:text-primary/80"
              >
                {t("backToLogin")}
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
