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
import { Plus, Trash2, Edit, Users } from "lucide-react";

interface Payee {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  chequeLimit?: string;
  createdAt: string;
}

export default function PayeesPage() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    bankAccount: "",
    chequeLimit: "",
  });

  useEffect(() => {
    fetchPayees();
  }, []);

  async function fetchPayees() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/payees");
      if (!res.ok) throw new Error("Failed to fetch payees");
      const data = await res.json();
      setPayees(data);
    } catch (error) {
      console.error("Error fetching payees:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddNew() {
    setEditingPayee(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      bankAccount: "",
      chequeLimit: "",
    });
    setIsDialogOpen(true);
  }

  function handleEdit(payee: Payee) {
    setEditingPayee(payee);
    setFormData({
      name: payee.name,
      address: payee.address || "",
      phone: payee.phone || "",
      email: payee.email || "",
      bankAccount: payee.bankAccount || "",
      chequeLimit: payee.chequeLimit || "",
    });
    setIsDialogOpen(true);
  }

  async function handleDelete(payee: Payee) {
    if (!confirm(`Are you sure you want to delete "${payee.name}"?`)) return;

    try {
      const res = await fetch(`/api/payees?id=${payee.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete payee");
      setPayees(payees.filter((p) => p.id !== payee.id));
    } catch (error) {
      console.error("Error deleting payee:", error);
      alert("Failed to delete payee");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const url = editingPayee ? `/api/payees` : "/api/payees";
      const method = editingPayee ? "PUT" : "POST";

      const body = editingPayee
        ? { id: editingPayee.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save payee");
      }

      const saved = await res.json();
      if (editingPayee) {
        setPayees(payees.map((p) => (p.id === saved.id ? saved : p)));
      } else {
        setPayees([saved, ...payees]);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Saved Payees</h2>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus size={16} />
          Add Payee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading payees...
            </div>
          ) : payees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Bank Account</th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payees.map((payee) => (
                    <tr key={payee.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{payee.name}</td>
                      <td className="px-4 py-3">{payee.bankAccount || "-"}</td>
                      <td className="px-4 py-3">{payee.phone || "-"}</td>
                      <td className="px-4 py-3">{payee.email || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payee)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(payee)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No payees saved</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add payees to quickly select them when creating cheques.
              </p>
              <Button onClick={handleAddNew} className="mt-4 gap-2">
                <Plus size={16} />
                Add Your First Payee
              </Button>
            </CardContent>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPayee ? "Edit Payee" : "Add New Payee"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ram Bahadur"
                required
              />
            </div>

            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="Account number"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+977-XXXXXXXXXX"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div>
              <Label htmlFor="chequeLimit">Cheque Limit (NPR)</Label>
              <Input
                id="chequeLimit"
                type="number"
                value={formData.chequeLimit}
                onChange={(e) => setFormData({ ...formData, chequeLimit: e.target.value })}
                placeholder="e.g. 100000"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPayee ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
