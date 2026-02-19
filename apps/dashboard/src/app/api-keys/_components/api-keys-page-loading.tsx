import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ApiKeysPageLoading() {
  return (
    <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
      <CardHeader className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="overflow-x-auto border border-[#2cf4ff]/20">
          <div className="space-y-2 p-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
