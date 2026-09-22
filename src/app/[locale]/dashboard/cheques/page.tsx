"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, Trash2 } from "lucide-react";

interface ChequeEntry {
  id: string;
  accountHolder: string;
  payeeName?: string;
  chequeDate: string;
  amountNumber: string;
  amountWords: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    bank: { id: string; name: string };
  };
}

export default function ChequesPage() {
  const [cheques, setCheques] = useState<ChequeEntry[]>([]);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
  }, []);

  async function fetchCheques() {
    try {
      const res = await fetch("/api/cheques?limit=50");
      if (!res.ok) throw new Error("Failed to fetch cheques");
      const data = await res.json();
      setCheques(data);
    } catch (error) {
      console.error("Error fetching cheques:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(chequeId: string) {
    if (!confirm("Are you sure you want to delete this cheque?")) return;

    try {
      const res = await fetch(`/api/cheques?id=${chequeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCheques(cheques.filter((c) => c.id !== chequeId));
    } catch (error) {
      alert("Failed to delete cheque");
    }
  }

  async function handleExportPDF(chequeId: string) {
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chequeId }),
      });

      if (!res.ok) throw new Error("Failed to export PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cheque-${chequeId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Cheques</h2>
        <Button variant="outline" onClick={() => window.location.assign("/en/dashboard/print")}>
          <Printer size={16} className="mr-2" />
          New Cheque
        </Button>
      </div>

      {cheques.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Payee</th>
                    <th className="px-4 py-3 text-left font-medium">Bank</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cheques.map((cheque) => (
                    <tr key={cheque.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {cheque.payeeName || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">{cheque.template?.bank?.name}</td>
                      <td className="px-4 py-3">
                        {new Date(cheque.chequeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        NPR {parseFloat(cheque.amountNumber).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            cheque.status === "PRINTED"
                              ? "bg-green-100 text-green-700"
                              : cheque.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {cheque.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPDF(cheque.id)}
                            title="Export PDF"
                          >
                            <Download size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cheque.id)}
                            title="Delete"
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No cheques found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your created cheques and drafts will appear here.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => window.location.assign("/en/dashboard/print")}
            >
              <Printer size={16} className="mr-2" />
              Create First Cheque
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
