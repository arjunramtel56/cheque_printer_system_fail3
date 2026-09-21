import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChequesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Cheques</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Your saved cheques and drafts will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
