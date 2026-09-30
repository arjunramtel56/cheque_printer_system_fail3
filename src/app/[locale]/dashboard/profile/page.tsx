"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { BadgeCheck, Shield, Save } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  company: string | null;
  phone: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const locale = useLocale() as "en" | "ne";
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: "", company: "", phone: "" });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("failed");
      const data: Profile = await res.json();
      setProfile(data);
      setFormData({
        name: data.name || "",
        company: data.company || "",
        phone: data.phone || "",
      });
    } catch {
      setLoadError(
        locale === "ne"
          ? "प्रोफाइल लोड गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।"
          : "Could not load your profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (formData.name.trim().length < 2) {
      setError(
        locale === "ne" ? "नाम कम्तीमा २ अक्षरको हुनुपर्छ।" : "Name must be at least 2 characters."
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error ??
            (locale === "ne" ? "प्रोफाइल अद्यावधिक गर्न सकिएन।" : "Could not update your profile.")
        );
        return;
      }

      setProfile(data);
      showToast(
        locale === "ne" ? "प्रोफाइल अद्यावधिक भयो।" : "Profile updated successfully.",
        "success"
      );
    } catch {
      setError(
        locale === "ne"
          ? "सञ्जालमा समस्या भयो। फेरि प्रयास गर्नुहोस्।"
          : "Network problem — please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {locale === "ne" ? "लोड हुँदै…" : "Loading…"}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" className="mt-4" onClick={fetchProfile}>
              {locale === "ne" ? "फेरि प्रयास" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleBadge =
    profile?.role === "TRIAL_USER"
      ? {
          label: locale === "ne" ? "ट्रायल" : "Trial",
          cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
        }
      : profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN"
        ? {
            label: profile.role,
            cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200",
          }
        : {
            label: locale === "ne" ? "प्रीमियम" : "Paid",
            cls: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200",
          };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("personalInfo")}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">{t("fullName")} *</Label>
                  <Input
                    id="fullName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    minLength={2}
                    maxLength={100}
                    className="mt-1"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    readOnly
                    className="mt-1 opacity-70"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locale === "ne"
                      ? "इमेल लगइन पहिचानकर्ता हो — परिवर्तन गर्न मिल्दैन।"
                      : "Email is your login identifier and cannot be changed."}
                  </p>
                </div>
                <div>
                  <Label htmlFor="company">{t("company")}</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    maxLength={150}
                    placeholder={t("companyName")}
                    className="mt-1"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={30}
                    placeholder={t("phonePlaceholder")}
                    className="mt-1"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  {isSaving ? (locale === "ne" ? "सुरक्षित हुँदै…" : "Saving…") : t("saveChanges")}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={16} />
              {locale === "ne" ? "खाता विवरण" : "Account details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{locale === "ne" ? "भूमिका" : "Role"}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${roleBadge.cls}`}
              >
                <BadgeCheck size={12} />
                {roleBadge.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{locale === "ne" ? "अवस्था" : "Status"}</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  profile?.status === "ACTIVE"
                    ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {profile?.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {locale === "ne" ? "दर्ता मिति" : "Registered"}
              </span>
              <span>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(
                      locale === "ne" ? "ne-NP" : "en-GB",
                      { year: "numeric", month: "short", day: "numeric" }
                    )
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
