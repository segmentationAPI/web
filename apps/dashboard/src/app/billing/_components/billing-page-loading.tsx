import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BillingPageLoading() {
  return (
    <Card className="glass-panel border-border/70 bg-card/75 rounded-[1.6rem] py-6">
      <CardHeader className="space-y-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[1.35rem]" />
        <Skeleton className="h-12 w-full rounded-[1rem]" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
