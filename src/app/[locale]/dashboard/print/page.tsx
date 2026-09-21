import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";

export default async function PrintChequePage() {
  const session = await auth();
  const user = session?.user as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Print Cheque</h2>
          <p className="text-muted-foreground">Fill in the cheque details below</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cheque Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank</Label>
                  <select
                    id="bank"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select bank</option>
                    <option value="nabil">Nabil Bank</option>
                    <option value="nepal-investment">Nepal Investment Bank</option>
                    <option value="global-imE">Global IME Bank</option>
                    <option value="prabhu">Prabhu Bank</option>
                    <option value="nic">NIC Asia Bank</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">Cheque Number</Label>
                  <Input id="chequeNumber" placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input id="accountHolder" placeholder="Name as on cheque book" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payee">Payee Name</Label>
                <Input id="payee" placeholder="Who is this cheque for?" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NPR)</Label>
                  <Input id="amount" type="number" placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount in Words</Label>
                <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                  Auto-generated from amount...
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input id="memo" placeholder="Payment purpose" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="crossed" className="rounded" />
                <Label htmlFor="crossed" className="text-sm">
                  Cross cheque (A/C Payee only)
                </Label>
              </div>

              <div className="flex gap-3">
                <Button type="button" className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button type="button" variant="outline" className="flex-1">
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Print Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[210/90] items-center justify-center rounded-md border-2 border-dashed bg-white">
              <div className="text-center text-muted-foreground">
                <Printer className="mx-auto h-12 w-12" />
                <p className="mt-2 text-sm">Fill the form to see preview</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Preview shows approximate layout. Final print position may vary depending on your printer calibration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
