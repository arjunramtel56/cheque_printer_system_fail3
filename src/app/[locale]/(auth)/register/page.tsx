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
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const apiError = typeof data?.error === "string" ? data.error : "";
        setError(mapRegisterError(apiError, t));
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError(t("somethingWentWrong"));
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <img src={siteConfig.logo} alt={siteConfig.company} className="logo-image h-10 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("createAccount")}</CardTitle>
        <CardDescription>{t("startFreeTrial")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive" title={error} />}

          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")} *</Label>
            <Input
              id="fullName"
              name="name"
              placeholder={t("namePlaceholder")}
              required
              minLength={2}
              disabled={loading}
              aria-required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")} *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={loading}
              autoComplete="email"
              aria-required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">{t("company")}</Label>
            <Input
              id="company"
              name="company"
              placeholder={t("companyOptional")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" name="phone" placeholder={t("phonePlaceholder")} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")} *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t("passwordHint")}
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
              aria-required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")} *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••"
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
              aria-required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                {t("creatingAccount")}
              </div>
            ) : (
              t("createAccountBtn")
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:text-primary/80"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function mapRegisterError(apiError: string, t: ReturnType<typeof useTranslations>): string {
  if (/already/i.test(apiError)) return t("emailAlreadyRegistered");
  if (/name/i.test(apiError)) return t("fullNameRequired");
  if (/email/i.test(apiError) && /invalid/i.test(apiError)) return t("invalidEmail");
  if (/password/i.test(apiError)) return t("passwordTooShort");
  if (/registered/i.test(apiError)) return t("emailAlreadyRegistered");
  return apiError || t("somethingWentWrong");
}
