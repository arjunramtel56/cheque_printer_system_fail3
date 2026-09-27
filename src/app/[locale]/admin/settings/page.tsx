"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/providers/toast-provider";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const t = useTranslations("admin_settings");
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data.raw || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(key: string) {
    setIsSaving(true);
    try {
      let parsedValue: any = editValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: parsedValue }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update setting");
      }

      const updated = await res.json();
      setSettings(settings.map((s) => (s.key === key ? updated : s)));
      setEditingKey(null);
    } catch (error: any) {
      showToast(error?.message || t("save"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(setting: SystemSetting) {
    setEditingKey(setting.key);
    setEditValue(JSON.stringify(setting.value));
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
  }

  function formatValue(value: any): string {
    if (typeof value === "string") return `"${value}"`;
    return JSON.stringify(value, null, 2);
  }

  const categorizedSettings = settings.reduce((acc: Record<string, SystemSetting[]>, setting) => {
    const category = setting.key.split(".")[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button variant="outline" size="sm" onClick={fetchSettings}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t("noSettings")}</h3>
          </CardContent>
        </Card>
      ) : (
        Object.entries(categorizedSettings).map(([category, catSettings]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {catSettings.map((setting) => (
                  <div key={setting.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Label className="font-medium">{setting.key}</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {setting.description || t("noDescription")}
                        </p>
                        {editingKey === setting.key ? (
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                            rows={3}
                            spellCheck={false}
                          />
                        ) : (
                          <pre className="mt-2 rounded bg-muted p-2 text-xs text-foreground">
                            {formatValue(setting.value)}
                          </pre>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        {editingKey === setting.key ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(setting.key)}
                              disabled={isSaving}
                            >
                              <Save size={14} className="mr-1" />
                              {isSaving ? t("saving") : t("save")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(setting)}>
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
