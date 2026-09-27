"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Banknote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/providers/toast-provider";

interface Bank {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  isActive: boolean;
  templates: any[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminBanksPage() {
  const t = useTranslations("admin_banks");
  const { showToast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    logoUrl: "",
    isActive: true,
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  async function fetchBanks() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("Failed to fetch banks");
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddNew() {
    setEditingBank(null);
    setFormData({ name: "", code: "", logoUrl: "", isActive: true });
    setIsDialogOpen(true);
  }

  function handleEdit(bank: Bank) {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      code: bank.code,
      logoUrl: bank.logoUrl || "",
      isActive: bank.isActive,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const url = editingBank ? `/api/admin/banks/${editingBank.id}` : "/api/admin/banks";
      const method = editingBank ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save bank");
      }

      const saved = await res.json();
      if (editingBank) {
        setBanks(banks.map((b) => (b.id === saved.id ? saved : b)));
      } else {
        setBanks([saved, ...banks]);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      showToast(error?.message || t("saveError"), "error");
    }
  }

  async function handleDelete(bank: Bank) {
    if (!window.confirm(t("deleteConfirm", { name: bank.name }))) return;

    try {
      const res = await fetch(`/api/admin/banks/${bank.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete bank");
      setBanks(banks.filter((b) => b.id !== bank.id));
    } catch (error) {
      showToast(t("deleteError"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus size={16} />
          {t("addBank")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("allBanks")}</CardTitle>
        </CardHeader>
        <CardContent>
          {banks.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noBanksConfigured")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("noBanksDesc")}</p>
              <Button onClick={handleAddNew} className="mt-4 gap-2">
                <Plus size={16} />
                {t("addFirstBank")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {banks.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <Banknote className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{bank.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("code")}: {bank.code} · {bank.templates.length} {t("templates")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        bank.isActive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {bank.isActive ? t("active") : t("inactive")}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(bank)}>
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(bank)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? t("editBank") : t("addNewBank")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">{t("bankName")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("namePlaceholder")}
                required
              />
            </div>

            <div>
              <Label htmlFor="code">{t("bankCode")}</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder={t("codePlaceholder")}
                maxLength={10}
                required
              />
            </div>

            <div>
              <Label htmlFor="logoUrl">{t("logoUrl")}</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder={t("logoPlaceholder")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="isActive" className="font-normal">
                {t("active")}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingBank ? t("update") : t("create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
