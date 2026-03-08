import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "warning" | "danger" | "success";

function StatusDot({ tone }: { tone: StatusTone }) {
  const color =
    tone === "success"
      ? "bg-emerald-400"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "danger"
          ? "bg-rose-400"
          : "bg-muted-foreground/60";

  return (
    <span className="relative flex size-2">
      {(tone === "success" || tone === "warning") && (
        <span
          className={`absolute inline-flex size-full animate-ping rounded-full opacity-40 ${color}`}
        />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}

export function ToneBadge({ tone, children }: { tone: StatusTone; children: string }) {
  const className =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : tone === "danger"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-border/50 bg-muted/40 text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={`h-6 gap-1.5 rounded-md px-2.5 font-mono text-[10px] tracking-[0.12em] uppercase ${className}`}
    >
      <StatusDot tone={tone} />
      {children}
    </Badge>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2.5 text-xs text-rose-300"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h3>
  );
}

export function SectionDivider() {
  return (
    <div className="via-border/40 mx-4 h-px bg-gradient-to-r from-transparent to-transparent sm:mx-5" />
  );
}

export function formatTimestamp(value: number | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
