"use client";

import { ActionFooter } from "./unified-studio/action-footer";
import { ControlsPanel } from "./unified-studio/controls-panel";
import { ErrorStrip } from "./unified-studio/error-strip";
import { JobMetadataRow } from "./unified-studio/job-metadata-row";
import { PreviewPanel } from "./unified-studio/preview-panel";
import { StatusHeader } from "./unified-studio/status-header";
import { useBindStudioUser } from "./unified-studio/use-studio-view-model";

type UnifiedStudioProps = {
  userId: string;
};

export function UnifiedStudio({ userId }: UnifiedStudioProps) {
  useBindStudioUser(userId);

  return (
    <section className="glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
      <StatusHeader />
      <JobMetadataRow />
      <ErrorStrip />

      <div className="grid min-h-0 flex-1 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ControlsPanel />
        <PreviewPanel />
      </div>

      <ActionFooter />
    </section>
  );
}
