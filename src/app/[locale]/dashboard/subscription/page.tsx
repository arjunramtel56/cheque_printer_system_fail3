import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Subscription</h2>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <CreditCard className="h-10 w-10 text-primary" />
              <div>
                <p className="font-semibold">Trial Plan</p>
                <p className="text-sm text-muted-foreground">
                  Free for 14 days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Status</p>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                Active
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">10</p>
              <p className="text-sm text-muted-foreground">Cheque Limit</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">14</p>
              <p className="text-sm text-muted-foreground">Days Remaining</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Cheques Used</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-semibold">Upgrade Plans</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="font-semibold">Standard</p>
                <p className="text-2xl font-bold">NPR 500<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>100 cheque prints/month</li>
                  <li>All bank templates</li>
                  <li>Export to PDF</li>
                </ul>
                <button className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Upgrade
                </button>
              </div>
              <div className="rounded-md border p-4">
                <p className="font-semibold">Business</p>
                <p className="text-2xl font-bold">NPR 1,500<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Unlimited prints</li>
                  <li>All bank templates</li>
                  <li>Priority support</li>
                </ul>
                <button className="mt-4 w-full rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5">
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
