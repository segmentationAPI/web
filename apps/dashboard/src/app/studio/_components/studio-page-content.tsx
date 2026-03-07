import { DashboardPageShell, DashboardPanelShell } from "@/components/dashboard-page-shell";

import { ActionFooter } from "./unified-studio/action-footer";
import { ControlsPanel } from "./unified-studio/controls-panel";
import { PreviewPanel } from "./unified-studio/preview-panel";
import { StatusHeader } from "./unified-studio/status-header";

export function StudioPageContent() {
  return (
    <DashboardPageShell className="h-full min-h-0 max-w-300 overflow-hidden py-3 sm:py-4">
      <DashboardPanelShell className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
        <StatusHeader />

        <div className="grid min-h-0 flex-1 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ControlsPanel />
          <PreviewPanel />
        </div>

        <ActionFooter />
      </DashboardPanelShell>
    </DashboardPageShell>
  );
}
