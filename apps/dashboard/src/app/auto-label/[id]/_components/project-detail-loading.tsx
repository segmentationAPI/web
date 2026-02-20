import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-64 w-full rounded-[1.35rem]" />
    </div>
  );
}
