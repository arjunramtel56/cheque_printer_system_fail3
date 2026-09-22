"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Plus } from "lucide-react";

interface Bank {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  templates: Template[];
}

interface Template {
  id: string;
  name: string;
  chequeWidth: number;
  chequeHeight: number;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export default function TemplatesPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cheque Templates</h2>
        <Button variant="outline" onClick={() => window.location.assign("/en/dashboard/print")}>
          <Plus size={16} className="mr-2" />
          New Cheque
        </Button>
      </div>

      <div className="space-y-4">
        {banks.map((bank) => (
          <Card key={bank.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{bank.name}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {bank.templates.length} template(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bank.templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates available</p>
              ) : (
                <div className="space-y-3">
                  {bank.templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.chequeWidth}mm × {template.chequeHeight}mm
                          {template.isDefault && " · Default"}
                          {" · v" + template.version}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          (window.location.href = "/en/dashboard/print")
                        }
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
