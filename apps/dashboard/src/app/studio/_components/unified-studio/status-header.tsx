"use client";

import { ToneBadge } from "@/components/studio/studio-status-primitives";
import {
  useFailedItems,
  useJobId,
  useStatus,
  useSucceededItems,
  useTotalItems,
} from "../../_store/studio.store";
import { getStudioStatusMeta } from "../../utils";

export function StatusHeader() {
  const jobId = useJobId();
  const status = useStatus();
  const totalItems = useTotalItems();
  const succeededItems = useSucceededItems();
  const failedItems = useFailedItems();
  const statusMeta = getStudioStatusMeta(status);

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
    </div>
  );
}
