import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BillingPageLoading() {
  return (
    <>
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-3 rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
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
