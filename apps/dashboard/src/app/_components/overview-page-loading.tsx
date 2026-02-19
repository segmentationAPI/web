import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewPageLoading() {
  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
