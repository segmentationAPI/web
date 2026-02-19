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
        "inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        status === "success"
          ? "border-[#2cf4ff]/40 bg-[#2cf4ff]/10 text-[#94fcff]"
          : "border-[#ff5470]/40 bg-[#ff5470]/10 text-[#ff9dae]",
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
