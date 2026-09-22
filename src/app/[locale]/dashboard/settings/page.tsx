"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

interface Bank {
  id: string;
  name: string;
  code: string;
  templates: Array<{ id: string; name: string }>;
}

interface UserSettings {
  id: string;
  userId: string;
  defaultBankId?: string;
  defaultTemplateId?: string;
  defaultAccountName?: string;
  language: string;
  dateFormat: string;
  currency: string;
  printerName?: string;
  defaultBank?: Bank;
  defaultTemplate?: { id: string; name: string };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    defaultBankId: "",
    defaultTemplateId: "",
    defaultAccountName: "",
    language: "en",
    dateFormat: "YYYY-MM-DD",
    currency: "NPR",
    printerName: "",
  });

  useEffect(() => {
    Promise.all([fetchSettings(), fetchBanks()]);
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
      setFormData({
        defaultBankId: data.defaultBankId || "",
        defaultTemplateId: data.defaultTemplateId || "",
        defaultAccountName: data.defaultAccountName || "",
        language: data.language || "en",
        dateFormat: data.dateFormat || "YYYY-MM-DD",
        currency: data.currency || "NPR",
        printerName: data.printerName || "",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBanks() {
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) return;
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      const updated = await res.json();
      setSettings(updated);
      alert("Settings saved successfully");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const selectedBank = banks.find((b) => b.id === formData.defaultBankId);
  const availableTemplates = selectedBank?.templates || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="defaultBankId">Default Bank</Label>
              <Select
                value={formData.defaultBankId}
                onValueChange={(value: string) =>
                  setFormData({
                    ...formData,
                    defaultBankId: value,
                    defaultTemplateId: "",
                  })
                }
              >
                <SelectTrigger id="defaultBankId">
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableTemplates.length > 0 && (
              <div>
                <Label htmlFor="defaultTemplateId">Default Template</Label>
                <Select
                  value={formData.defaultTemplateId}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, defaultTemplateId: value })
                  }
                >
                  <SelectTrigger id="defaultTemplateId">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="defaultAccountName">Default Account Name</Label>
              <Input
                id="defaultAccountName"
                value={formData.defaultAccountName}
                onChange={(e) =>
                  setFormData({ ...formData, defaultAccountName: e.target.value })
                }
                placeholder="e.g. My Business Account"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value: string) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(value: string) => setFormData({ ...formData, dateFormat: value })}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</SelectItem>
                  <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (15-01-2024)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: string) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPR">NPR (Nepalese Rupee)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="printerName">Default Printer</Label>
              <Input
                id="printerName"
                value={formData.printerName}
                onChange={(e) => setFormData({ ...formData, printerName: e.target.value })}
                placeholder="Leave blank for default printer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : (
            <>
              <Settings size={16} className="mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
