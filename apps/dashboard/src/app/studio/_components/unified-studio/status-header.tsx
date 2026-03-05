import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  useStudioErrorViewModel,
  useStudioMetadataViewModel,
  useStudioStatusHeaderViewModel,
} from "./use-studio-view-model";
import { formatTimestamp, ToneBadge } from "./studio-ui-primitives";

export function StatusHeader() {
  const {
    statusTone,
    statusLabel,
    canRefresh,
    statusRefreshing,
    onRefresh,
  } = useStudioStatusHeaderViewModel();
  const { currentAsyncJobId, progressText, lastRefreshedAt, showMetadata } =
    useStudioMetadataViewModel();
  const { runError, refreshError } = useStudioErrorViewModel();
  const inlineError = [runError, refreshError].filter(Boolean).join(" • ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/30 px-4 py-2 sm:px-5">
      <div className="min-w-0 flex-1 space-y-1" aria-live="polite">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToneBadge tone={statusTone}>{statusLabel}</ToneBadge>

          {showMetadata ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Job {currentAsyncJobId ?? "—"} • {progressText ?? "0/0"} • Refreshed {formatTimestamp(lastRefreshedAt)}
            </p>
          ) : null}

          {inlineError ? (
            <p
              className="ml-auto flex min-w-0 items-center justify-end gap-1 text-xs text-rose-300 text-right"
              role="alert"
            >
              <AlertTriangle className="size-3 shrink-0 text-rose-400" />
              <span className="truncate">{inlineError}</span>
            </p>
          ) : null}
        </div>
      </div>

      {canRefresh ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={statusRefreshing}
          className="gap-1.5 text-muted-foreground"
          aria-label="Refresh job status"
        >
          <RefreshCw className={`size-3 ${statusRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
