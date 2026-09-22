"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, LayoutTemplate, Save } from "lucide-react";
import ChequePreview from "@/components/cheque/cheque-preview";
import { ChequeTemplate } from "@/types";

interface Bank {
  id: string;
  name: string;
  code: string;
}

interface TemplateField {
  id: string;
  field: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  letterSpacing?: number;
  align?: string;
  rotation?: number;
  color?: string;
  format?: string;
}

interface Template {
  id: string;
  name: string;
  bankId: string;
  bank: Bank;
  chequeWidth: number;
  chequeHeight: number;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  fields: TemplateField[];
}

const FIELD_PRESETS = [
  { field: "payee", label: "Payee (Amount Words line)" },
  { field: "date", label: "Date" },
  { field: "amountNumber", label: "Amount (Number)" },
  { field: "name", label: "Account Holder Name" },
  { field: "chequeNumber", label: "Cheque Number" },
];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    bankId: "",
    name: "",
    chequeWidth: 210,
    chequeHeight: 90,
    isDefault: false,
    isActive: true,
    fields: [] as any[],
  });

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchBanks()]);
  }, []);

  async function fetchTemplates() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBanks() {
    try {
      const res = await fetch("/api/admin/banks");
      if (!res.ok) throw new Error("Failed to fetch banks");
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  }

  function handleAddNew() {
    setEditingTemplate(null);
    setFormData({
      bankId: "",
      name: "",
      chequeWidth: 210,
      chequeHeight: 90,
      isDefault: false,
      isActive: true,
      fields: [],
    });
    setIsDialogOpen(true);
  }

  function handleEdit(template: Template) {
    setEditingTemplate(template);
    setFormData({
      bankId: template.bankId,
      name: template.name,
      chequeWidth: template.chequeWidth,
      chequeHeight: template.chequeHeight,
      isDefault: template.isDefault,
      isActive: template.isActive,
      fields: template.fields,
    });
    setIsDialogOpen(true);
  }

  function handleAddField() {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          field: "payee",
          x: 25,
          y: 40,
          fontSize: 10,
          fontFamily: "Arial",
          fontWeight: "normal",
        },
      ],
    }));
  }

  function updateField(index: number, key: string, value: any) {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
    }));
  }

  function removeField(index: number) {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate.id}`
        : "/api/admin/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const body: any = {
        bankId: formData.bankId,
        name: formData.name,
        chequeWidth: formData.chequeWidth,
        chequeHeight: formData.chequeHeight,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
        fields: formData.fields,
      };

      if (!editingTemplate) {
        delete body.isActive;
        delete body.bankId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save template");
      }

      const saved = await res.json();
      if (editingTemplate) {
        setTemplates(templates.map((t) => (t.id === saved.id ? saved : t)));
      } else {
        setTemplates([saved, ...templates]);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleDelete(template: Template) {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/templates?id=${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete template");
      setTemplates(templates.filter((t) => t.id !== template.id));
    } catch (error) {
      alert("Failed to delete template");
    }
  }

  const previewTemplate: ChequeTemplate | null =
    formData.fields.length > 0
      ? {
          id: editingTemplate?.id || "",
          name: formData.name || "Template",
          bankId: formData.bankId,
          bankName: banks.find((b) => b.id === formData.bankId)?.name || "",
          chequeWidth: formData.chequeWidth,
          chequeHeight: formData.chequeHeight,
          fields: formData.fields.map((f) => ({
            field: f.field,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            fontSize: f.fontSize,
            fontFamily: f.fontFamily,
            fontWeight: f.fontWeight,
            letterSpacing: f.letterSpacing,
            align: (f.align || "left") as "left" | "center" | "right",
            rotation: f.rotation,
            color: f.color,
            format: f.format,
          })),
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Templates</h2>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus size={16} />
          Add Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No templates configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add templates to define cheque layouts for bank cheque books.
              </p>
              <Button onClick={handleAddNew} className="mt-4 gap-2">
                <Plus size={16} />
                Add First Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.bank.name} · {template.chequeWidth}mm × {template.chequeHeight}
                          mm · {template.fields.length} field(s)
                          {template.isDefault && " · Default"}
                          {" · v" + template.version}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        template.isActive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add New Template"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="bankId">Bank *</Label>
                <Select
                  value={formData.bankId}
                  onValueChange={(value) => setFormData({ ...formData, bankId: value })}
                >
                  <SelectTrigger id="bankId">
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

              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard Cheque"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chequeWidth">Cheque Width (mm)</Label>
                  <Input
                    id="chequeWidth"
                    type="number"
                    value={formData.chequeWidth}
                    onChange={(e) =>
                      setFormData({ ...formData, chequeWidth: parseInt(e.target.value) || 210 })
                    }
                    min="50"
                    max="210"
                  />
                </div>
                <div>
                  <Label htmlFor="chequeHeight">Cheque Height (mm)</Label>
                  <Input
                    id="chequeHeight"
                    type="number"
                    value={formData.chequeHeight}
                    onChange={(e) =>
                      setFormData({ ...formData, chequeHeight: parseInt(e.target.value) || 90 })
                    }
                    min="50"
                    max="297"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <Label className="font-normal">Set as default template for this bank</Label>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <Label className="font-normal">Active</Label>
                </label>
              </div>

              <div>
                <Label className="mb-2 block">Template Fields</Label>
                <div className="space-y-3">
                  {formData.fields.map((field, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={field.field}
                          onValueChange={(value) => updateField(index, "field", value)}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_PRESETS.map((preset) => (
                              <SelectItem key={preset.field} value={preset.field}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                          className="text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="X (mm)"
                          value={field.x}
                          onChange={(e) => updateField(index, "x", parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Y (mm)"
                          value={field.y}
                          onChange={(e) => updateField(index, "y", parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Width (mm)"
                          value={field.width || ""}
                          onChange={(e) =>
                            updateField(
                              index,
                              "width",
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Font size"
                          value={field.fontSize || 12}
                          onChange={(e) =>
                            updateField(index, "fontSize", parseFloat(e.target.value) || 12)
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1"
                  onClick={handleAddField}
                >
                  <Plus size={14} />
                  Add Field
                </Button>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save size={16} className="mr-2" />
                  {editingTemplate ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>

            <div className="border border-slate-200 p-4 bg-slate-50">
              <h3 className="mb-2 font-bold text-slate-700">Preview</h3>
              <div className="flex min-h-[200px] items-center justify-center overflow-auto">
                {previewTemplate && (
                  <ChequePreview
                    template={previewTemplate}
                    fields={{
                      date: "15/01/2024",
                      payee: "Ram Bahadur",
                      amountWords: "One Thousand Rupees Only",
                      amountNumber: "1000.00",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
