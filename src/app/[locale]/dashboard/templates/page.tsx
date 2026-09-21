import { Card, CardContent } from "@/components/ui/card";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Templates</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Your saved cheque templates will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
