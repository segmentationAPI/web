"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/studio/studio-status-primitives";
import {
  useFailedItems,
  useJobId,
  useRefreshOutput,
  useSetOutputLinks,
  useStatus,
  useSucceededItems,
  useTotalItems,
} from "../../_store/studio.store";
import { getJobStatus, getOutputManifest } from "../../actions";
import {
  extractManifestPreviewUrls,
  getStudioStatusMeta,
  hasTerminalStudioItems,
} from "../../utils";

export function StatusHeader() {
  const jobId = useJobId();
  const status = useStatus();
  const totalItems = useTotalItems();
  const succeededItems = useSucceededItems();
  const failedItems = useFailedItems();
  const refreshOutput = useRefreshOutput();
  const setOutputLinks = useSetOutputLinks();
  const statusMeta = getStudioStatusMeta(status);

  const handleRefreshOutput = async () => {
    const status = await getJobStatus(jobId);
    refreshOutput(status);

    if (hasTerminalStudioItems(status)) {
      const outputManifest = await getOutputManifest(jobId);
      const previewUrls = extractManifestPreviewUrls(outputManifest.items.map((item) => item.previewUrl));
      setOutputLinks(previewUrls);
    }
  };

  return (
    <div className="border-border/30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2 sm:px-5">
      <div className="min-w-0 flex-1 space-y-1" aria-live="polite">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToneBadge tone={statusMeta.tone}>{statusMeta.label}</ToneBadge>

          {jobId ? (
            <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              Job {jobId} • {`${succeededItems + failedItems}/${totalItems}`}
            </p>
          ) : null}
        </div>
      </div>

      {jobId ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefreshOutput}
          className="text-muted-foreground gap-1.5"
          aria-label="Refresh job status"
        >
          <RefreshCw className="size-3" />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
