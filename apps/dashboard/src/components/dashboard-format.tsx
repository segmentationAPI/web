import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function formatNumber(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString();
}

export function formatDate(value: Date | string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString();
}

const statusConfig = {
  success: {
    className: "border-secondary/45 bg-secondary/15 text-secondary",
    icon: CheckCircle2,
  },
  failed: {
    className: "border-destructive/45 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  queued: {
    className: "border-muted-foreground/45 bg-muted/30 text-muted-foreground",
    icon: Clock,
  },
  processing: {
    className: "border-primary/45 bg-primary/15 text-primary",
    icon: Loader2,
  },
} as const;

export function StatusPill({ status }: { status: "queued" | "processing" | "success" | "failed" }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        config.className,
      )}
    >
      <Icon className={cn("size-3", status === "processing" && "animate-spin")} aria-hidden />
      {status}
    </span>
  );
}
