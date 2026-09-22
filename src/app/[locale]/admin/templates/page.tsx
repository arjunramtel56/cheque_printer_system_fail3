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
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, LayoutTemplate, ChevronDown } from "lucide-react";

interface Bank {
  id: string;
  name: string;
  code: string;
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
  fields: Field[];
  createdAt: string;
}

interface Field {
  id: string;
  templateId: string;
  field: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  align?: string;
  rotation?: number;
  color?: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    bankId: "",
    name: "",
    chequeWidth: 210,
    chequeHeight: 90,
    isDefault: false,
    isFieldDialogOpen: false,
  });

  const [fields, setFields] = useState<Partial<Field>[]>([]);
  const [fieldForm, setFieldForm] = useState({
    field: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "normal",
    align: "left",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [banksRes, templatesRes] = await Promise.all([
        fetch("/api/banks"),
        fetch("/api/templates"),
      ]);

      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBanks(banksData);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddField() {
    setFields([...fields, { ...fieldForm }]);
    setFieldForm({
      field: "",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fontSize: 12,
      fontFamily: "Arial",
      fontWeight: "normal",
      align: "left",
    });
  }

  function handleRemoveField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!formData.bankId || !formData.name) {
      alert("Bank and name are required");
      return;
    }

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: formData.bankId,
          name: formData.name,
          chequeWidth: formData.chequeWidth,
          chequeHeight: formData.chequeHeight,
          isDefault: formData.isDefault,
          fields: fields.map((f) => ({
            field: f.field,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            fontSize: f.fontSize,
            fontFamily: f.fontFamily,
            fontWeight: f.fontWeight,
            align: f.align,
            rotation: f.rotation,
            color: f.color,
            format: f.format,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create template");
      }

      const created = await res.json();
      setTemplates([created, ...templates]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  }

  function resetForm() {
    setFormData({
      bankId: "",
      name: "",
      chequeWidth: 210,
      chequeHeight: 90,
      isDefault: false,
      isFieldDialogOpen: false,
    });
    setFields([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Templates</h2>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus size={16} />
          Add Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No templates found
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium">{template.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.bank?.name} · {template.chequeWidth}mm × {template.chequeHeight}mm · {template.fields?.length || 0} fields
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        template.isActive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Template</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="bankId">Bank *</Label>
                <select
                  id="bankId"
                  value={formData.bankId}
                  onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a bank</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
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

              <div>
                <Label htmlFor="chequeWidth">Cheque Width (mm)</Label>
                <Input
                  id="chequeWidth"
                  type="number"
                  value={formData.chequeWidth}
                  onChange={(e) => setFormData({ ...formData, chequeWidth: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="chequeHeight">Cheque Height (mm)</Label>
                <Input
                  id="chequeHeight"
                  type="number"
                  value={formData.chequeHeight}
                  onChange={(e) => setFormData({ ...formData, chequeHeight: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="font-normal">
                Set as default template for this bank
              </Label>
            </div>

            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <Label>Template Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
                  <Plus size={14} className="mr-1" />
                  Add Field
                </Button>
              </div>

              {fields.length > 0 ? (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 rounded-md border p-2">
                      <Input
                        placeholder="Field name"
                        value={field.field}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].field = e.target.value;
                          setFields(newFields);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="X (%)"
                        value={field.x || ""}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].x = parseFloat(e.target.value) || 0;
                          setFields(newFields);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Y (%)"
                        value={field.y || ""}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].y = parseFloat(e.target.value) || 0;
                          setFields(newFields);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Font size"
                        value={field.fontSize || 12}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[index].fontSize = parseFloat(e.target.value) || 12;
                          setFields(newFields);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No fields added. Add fields to position cheque data.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.bankId || !formData.name}>
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
