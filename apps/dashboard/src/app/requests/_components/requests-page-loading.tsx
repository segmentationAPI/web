import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RequestsPageLoading() {
  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
        </div>
        <Skeleton className="h-9 w-24" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/55">
          <div className="space-y-2 p-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
