"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
 * Password-reset landing page (/reset-password?token=...).
 *
 * One-time token flow: on success the token is consumed server-side and the
 * user is sent to login. Unknown/expired tokens produce the same neutral
 * error — no information leak about which tokens exist.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tokenMissing = !token;

  // Keep the URL clean: the token must not linger in the address bar or
  // browser history after the page loads.
  useEffect(() => {
    if (token) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || t("somethingWentWrong"));
        setLoading(false);
        return;
      }

      setSuccess(true);
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
        <CardTitle className="text-2xl font-bold">{t("resetYourPassword")}</CardTitle>
        <CardDescription>{t("newPasswordLabel")}</CardDescription>
      </CardHeader>

      {tokenMissing ? (
        <CardContent className="space-y-4 text-center">
          <Alert variant="destructive" title={t("resetInvalidToken")} />
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full">
              {t("forgotPasswordQuestion")}
            </Button>
          </Link>
        </CardContent>
      ) : success ? (
        <CardContent className="space-y-4 text-center">
          <Alert variant="success" title={t("resetSuccessMessage")} />
          <Link href="/login">
            <Button className="w-full">{t("signIn")}</Button>
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive" title={error} />}

            <div className="space-y-2">
              <Label htmlFor="password">{t("newPasswordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                aria-required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                aria-required
              />
            </div>

            <p className="text-xs text-muted-foreground">{t("passwordRequirements")}</p>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  {t("resetting")}
                </div>
              ) : (
                t("resetYourPassword")
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
