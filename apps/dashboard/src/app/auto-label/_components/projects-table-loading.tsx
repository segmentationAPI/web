import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsTableLoading() {
    return (
        <div className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-6">
            {/* Header skeleton */}
            <div className="mb-6 flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-40" />
                </div>
                <Skeleton className="h-9 w-32 rounded-xl" />
            </div>

            {/* Column headers */}
            <div className="mb-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4">
                {["Project", "Images", "Status", "Modified", ""].map((col) => (
                    <Skeleton key={col} className="h-3 w-16" />
                ))}
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                        key={i}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 rounded-xl border border-border/50 bg-muted/35 px-4 py-3.5"
                    >
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
