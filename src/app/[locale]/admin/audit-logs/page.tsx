"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download, RefreshCw, FileText } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchAction, setSearchAction] = useState("");
  const [searchEntity, setSearchEntity] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  async function fetchAuditLogs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchAction) params.set("action", searchAction);
      if (searchEntity) params.set("entity", searchEntity);
      if (searchUserId) params.set("userId", searchUserId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const data: AuditLogsResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportCSV() {
    try {
      const res = await fetch("/api/admin/audit-logs?export=csv");
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export CSV");
    }
  }

  function handleSearch() {
    fetchAuditLogs();
  }

  function handleReset() {
    setSearchAction("");
    setSearchEntity("");
    setSearchUserId("");
    setDateFrom("");
    setDateTo("");
    fetchAuditLogs();
  }

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      CHEQUE_CREATED: "bg-blue-100 text-blue-700",
      CHEQUE_UPDATED: "bg-indigo-100 text-indigo-700",
      CHEQUE_DELETED: "bg-red-100 text-red-700",
      PRINT_CHEQUE: "bg-green-100 text-green-700",
      EXPORT_PDF: "bg-purple-100 text-purple-700",
      CREATE_BANK: "bg-amber-100 text-amber-700",
      UPDATE_BANK: "bg-orange-100 text-orange-700",
      DELETE_BANK: "bg-pink-100 text-pink-700",
      CREATE_TEMPLATE: "bg-teal-100 text-teal-700",
      UPDATE_TEMPLATE: "bg-cyan-100 text-cyan-700",
      DELETE_TEMPLATE: "bg-fuchsia-100 text-fuchsia-700",
      UPDATE_USER: "bg-indigo-100 text-indigo-700",
      DELETE_USER: "bg-red-100 text-red-700",
      UPDATE_SYSTEM_SETTING: "bg-gray-100 text-gray-700",
    };
    return colors[action] || "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchAuditLogs()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="searchAction">Action</Label>
              <Input
                id="searchAction"
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                placeholder="e.g. CHEQUE_CREATED"
              />
            </div>
            <div>
              <Label htmlFor="searchEntity">Entity</Label>
              <Input
                id="searchEntity"
                value={searchEntity}
                onChange={(e) => setSearchEntity(e.target.value)}
                placeholder="e.g. ChequeEntry"
              />
            </div>
            <div>
              <Label htmlFor="searchUserId">User ID</Label>
              <Input
                id="searchUserId"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="User ID"
              />
            </div>
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleSearch}>
              <Search size={16} className="mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({total} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No audit log entries match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Entity</th>
                    <th className="px-4 py-3 text-left font-medium">Entity ID</th>
                    <th className="px-4 py-3 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <p className="font-medium">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entity}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entityId || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {log.details && (
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                            {log.details}
                          </code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
