import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Print reports and analytics will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
