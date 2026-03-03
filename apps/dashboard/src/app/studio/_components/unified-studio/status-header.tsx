import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useStudioStatusHeaderViewModel } from "./use-studio-view-model";
import { ToneBadge } from "./studio-ui-primitives";

export function StatusHeader() {
  const {
    statusTone,
    statusLabel,
    statusSummary,
    canRefresh,
    statusRefreshing,
    onRefresh,
  } = useStudioStatusHeaderViewModel();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <ToneBadge tone={statusTone}>{statusLabel}</ToneBadge>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {statusSummary}
        </span>
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
