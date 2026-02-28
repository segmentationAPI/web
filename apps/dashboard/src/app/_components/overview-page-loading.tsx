import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewPageLoading() {
  return (
    <Card className="glass-panel rounded-[1.25rem] border-border/70 bg-card/80 py-3">
      <CardHeader className="space-y-2 pb-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="grid gap-3 border-t border-border/50 pt-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-22" />
          <Skeleton className="h-7 w-26" />
        </div>
        <div className="space-y-2 sm:border-l sm:border-border/50 sm:pl-4">
          <Skeleton className="h-3 w-22" />
          <Skeleton className="h-7 w-26" />
        </div>
      </CardContent>
    </Card>
  );
}
