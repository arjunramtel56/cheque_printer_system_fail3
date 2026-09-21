import { Card, CardContent } from "@/components/ui/card";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Password change and security settings will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
