import {
  CheckCircle2,
  Clock,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
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

const pillBaseClass =
  "inline-flex h-5 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.14em]";

function InlinePill(props: {
  className: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  spinning?: boolean;
}) {
  const Icon = props.icon;

  return (
    <Badge className={cn(pillBaseClass, props.className)} variant="outline">
      <Icon className={cn("size-3", props.spinning && "animate-spin")} aria-hidden />
      {props.label}
    </Badge>
  );
}

export function StatusPill({ status }: { status: "queued" | "processing" | "success" | "failed" }) {
  const config = statusConfig[status];
  return (
    <InlinePill
      className={config.className}
      icon={config.icon}
      label={status}
      spinning={status === "processing"}
    />
  );
}

const modeConfig = {
  batch: {
    className: "border-primary/45 bg-primary/15 text-primary",
    icon: Layers,
    label: "batch",
  },
  single: {
    className: "border-muted-foreground/45 bg-muted/30 text-muted-foreground",
    icon: ImageIcon,
    label: "single",
  },
  video: {
    className: "border-secondary/45 bg-secondary/15 text-secondary",
    icon: Film,
    label: "video",
  },
} as const;

export function ModePill({ mode }: { mode: "single" | "batch" | "video" }) {
  const config = modeConfig[mode];
  return <InlinePill className={config.className} icon={config.icon} label={config.label} />;
}
