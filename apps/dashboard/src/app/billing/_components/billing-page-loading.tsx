import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BillingPageLoading() {
  return (
    <>
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
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

      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </>
  );
}
