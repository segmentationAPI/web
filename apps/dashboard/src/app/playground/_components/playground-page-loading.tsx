import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaygroundPageLoading() {
  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(20rem,1fr)_minmax(24rem,1.2fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/50 p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-18 w-24 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-[430px] w-full rounded-lg" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
