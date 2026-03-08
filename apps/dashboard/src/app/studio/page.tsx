import { Suspense } from "react";

import { DashboardPageShell, DashboardPanelShell } from "@/components/dashboard-page-shell";
import { StudioPageContent } from "./_components/studio-page-content";

export const metadata = {
  title: "Studio — Segmentation API Dashboard",
  description: "Unified workspace for interactive and project-based segmentation.",
};

function StudioLoading() {
  return (
    <DashboardPageShell className="h-full min-h-0 max-w-[1320px] overflow-hidden py-3 sm:py-4">
      <DashboardPanelShell className="border-border/70 bg-card/75 rounded-[1.35rem] p-6">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
          Loading studio...
        </p>
      </DashboardPanelShell>
    </DashboardPageShell>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioPageContent />
    </Suspense>
  );
}
