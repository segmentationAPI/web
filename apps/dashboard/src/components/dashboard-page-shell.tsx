import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type DashboardPageShellProps = ComponentPropsWithoutRef<"main">;
type DashboardPanelShellProps = ComponentPropsWithoutRef<"section">;

export function DashboardPageShell({
  children,
  className,
  ...props
}: DashboardPageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col px-3 sm:px-6",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}

export function DashboardPanelShell({
  children,
  className,
  ...props
}: DashboardPanelShellProps) {
  return (
    <section className={cn("glass-panel", className)} {...props}>
      {children}
    </section>
  );
}
