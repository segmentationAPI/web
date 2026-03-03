import { formatTimestamp } from "./studio-ui-primitives";
import { useStudioMetadataViewModel } from "./use-studio-view-model";

export function JobMetadataRow() {
  const { currentAsyncJobId, progressText, lastRefreshedAt, showMetadata } =
    useStudioMetadataViewModel();

  if (!showMetadata) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border/20 bg-muted/15 px-4 py-2 sm:px-5"
      aria-live="polite"
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="text-foreground/50">Job</span> {currentAsyncJobId ?? "—"}
      </p>
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="text-foreground/50">Progress</span> {progressText ?? "0/0"}
      </p>
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="text-foreground/50">Refreshed</span> {formatTimestamp(lastRefreshedAt)}
      </p>
    </div>
  );
}
