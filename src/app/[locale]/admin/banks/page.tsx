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
      const url = editingBank
        ? `/api/admin/banks/${editingBank.id}`
        : "/api/admin/banks";
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
      alert(error.message);
    }
  }

  async function handleDelete(bank: Bank) {
    if (!confirm(`Delete "${bank.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/banks/${bank.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete bank");
      setBanks(banks.filter((b) => b.id !== bank.id));
    } catch (error) {
      alert("Failed to delete bank");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Banks</h2>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus size={16} />
          Add Bank
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Banks</CardTitle>
        </CardHeader>
        <CardContent>
          {banks.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No banks configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add banks to enable cheque printing for their templates.
              </p>
              <Button onClick={handleAddNew} className="mt-4 gap-2">
                <Plus size={16} />
                Add First Bank
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
                          Code: {bank.code} · {bank.templates.length} template(s)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        bank.isActive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {bank.isActive ? "Active" : "Inactive"}
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
            <DialogTitle>
              {editingBank ? "Edit Bank" : "Add New Bank"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Bank Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Nabil Bank Limited"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Bank Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. NABIL"
                maxLength={10}
                required
              />
            </div>

            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
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
                Active
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingBank ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
