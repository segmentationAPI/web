import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaygroundPageLoading() {
  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-44" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
