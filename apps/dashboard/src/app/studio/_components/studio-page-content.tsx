import { requirePageSession } from "@/lib/server/page-auth";
import { getBillingSummaryForUser, getActiveApiKeyForuser } from "@/lib/server/queries";
import { getBillingGateState } from "@/lib/billing-presentation";

import { DashboardPageShell, DashboardPanelShell } from "@/components/dashboard-page-shell";

import { ActionFooter } from "./unified-studio/action-footer";
import { ControlsPanel } from "./unified-studio/controls-panel";
import { PreviewPanel } from "./unified-studio/preview-panel";
import { StatusHeader } from "./unified-studio/status-header";

export async function StudioPageContent() {
  const session = await requirePageSession();
  const [billingState, activeApiKey] = await Promise.all([
    getBillingSummaryForUser(session.user.id),
    getActiveApiKeyForuser(session.user.id),
  ]);
  const hasActiveApiKey = activeApiKey !== null;
  const billingGate = getBillingGateState(billingState);
  const isPlaygroundMode = !billingGate.hasBillingSetup;

  return (
    <DashboardPageShell className="h-full min-h-0 max-w-300 overflow-hidden py-3 sm:py-4">
      <DashboardPanelShell className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
        <StatusHeader />

        <div className="grid min-h-0 flex-1 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ControlsPanel isPlaygroundMode={isPlaygroundMode} />
          <PreviewPanel />
        </div>

        <ActionFooter
          billingState={billingState}
          hasActiveApiKey={hasActiveApiKey}
          isPlaygroundMode={isPlaygroundMode}
        />
      </DashboardPanelShell>
    </DashboardPageShell>
  );
}
