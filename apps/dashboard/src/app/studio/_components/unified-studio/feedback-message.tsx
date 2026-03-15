"use client";

import type { ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackMessageProps = {
  children: string;
  className?: string;
};

function FeedbackMessageFrame({
  children,
  className,
  icon,
}: FeedbackMessageProps & { icon: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex max-w-sm items-start gap-2 rounded-lg border px-3 py-2 text-left", className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <p className="text-[11px] leading-relaxed">{children}</p>
    </div>
  );
}

export function NeutralFeedbackMessage({ children, className }: FeedbackMessageProps) {
  return (
    <FeedbackMessageFrame
      className={cn("border-border/60 bg-background/70 text-muted-foreground", className)}
      icon={<Info className="size-3.5" />}
    >
      {children}
    </FeedbackMessageFrame>
  );
}

export function SuccessFeedbackMessage({ children, className }: FeedbackMessageProps) {
  return (
    <FeedbackMessageFrame
      className={cn(
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        className,
      )}
      icon={<CircleCheck className="size-3.5" />}
    >
      {children}
    </FeedbackMessageFrame>
  );
}

export function ErrorFeedbackMessage({ children, className }: FeedbackMessageProps) {
  return (
    <FeedbackMessageFrame
      className={cn("border-destructive/30 bg-destructive/8 text-destructive", className)}
      icon={<TriangleAlert className="size-3.5" />}
    >
      {children}
    </FeedbackMessageFrame>
  );
}
