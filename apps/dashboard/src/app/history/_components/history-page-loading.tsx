import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type HistoryPageLoadingProps = {
  showDetail?: boolean;
  resultsOnly?: boolean;
};

function HistoryJobCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/70 bg-card/55 p-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-3 h-9 w-full" />
    </div>
  );
}

function HistoryResultsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        <HistoryJobCardSkeleton />
        <HistoryJobCardSkeleton />
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card/55 md:block">
        <div className="space-y-2 p-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function HistoryPageLoading({ showDetail = false, resultsOnly = false }: HistoryPageLoadingProps) {
  if (resultsOnly) {
    return <HistoryResultsSkeleton />;
  }

  if (showDetail) {
    return (
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-44 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
        </div>
        <Skeleton className="h-9 w-full sm:w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <HistoryResultsSkeleton />
      </CardContent>
    </Card>
  );
}
