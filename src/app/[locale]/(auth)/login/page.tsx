"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const i18nRouter = useI18nRouter();
  const searchParams = useSearchParams();
  // The i18n router prefixes the current locale itself, so callback URLs must
  // be locale-less (middleware passes locale-prefixed pathnames).
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/")
      ? rawCallback.replace(/^\/(en|ne)(?=\/|$)/, "") || "/"
      : "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    errorParam === "account_suspended"
      ? t("accountSuspended")
      : errorParam === "account_expired"
        ? t("accountExpired")
        : errorParam === "OAuthAccountNotLinked"
          ? t("oauthAccountNotLinked")
          : errorParam === "Configuration"
            ? t("serviceUnavailable")
            : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation (server remains the source of truth).
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t("fillAllFields"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError(t("invalidEmail"));
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Auth.js answers "Configuration" when the credentials callback throws
        // on the server (an unreachable database, for example). That is an
        // outage, not a bad password, and must not be blamed on the user.
        setError(
          result.error === "Configuration" ? t("serviceUnavailable") : t("invalidCredentials")
        );
        setLoading(false);
        return;
      }

      i18nRouter.push(callbackUrl);
      router.refresh();
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
        <CardTitle className="text-2xl font-bold">{t("welcomeBack")}</CardTitle>
        <CardDescription>{t("signInToAccount")}</CardDescription>
      </CardHeader>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t("forgotPassword")}
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            {t("dontHaveAccount")}{" "}
            <Link href="/register" className="text-primary hover:underline">
              {t("signUp")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
