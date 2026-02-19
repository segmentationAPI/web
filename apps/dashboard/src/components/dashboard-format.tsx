import { CheckCircle2, XCircle } from "lucide-react";

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

export function StatusPill({ status }: { status: "success" | "failed" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        status === "success"
          ? "border-secondary/45 bg-secondary/15 text-secondary"
          : "border-destructive/45 bg-destructive/10 text-destructive",
      )}
    >
      {status === "success" ? (
        <CheckCircle2 className="size-3" aria-hidden />
      ) : (
        <XCircle className="size-3" aria-hidden />
      )}
      {status}
    </span>
  );
}
