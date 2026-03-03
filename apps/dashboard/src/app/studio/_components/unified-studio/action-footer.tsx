import { Cog, Download, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

import { useStudioFooterViewModel } from "./use-studio-view-model";

export function ActionFooter() {
  const {
    isRunning,
    canPressRun,
    canDownloadArtifacts,
    uploadProgress,
    downloadInFlight,
    downloadAriaLabel,
    apiKey,
    onRunJob,
    onDownloadArtifacts,
    onResetStudio,
    onSetApiKey,
    onClearApiKey,
  } = useStudioFooterViewModel();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border/30 px-4 py-3 sm:px-5">
      <Button type="button" disabled={!canPressRun} onClick={onRunJob} size="lg">
        {isRunning ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            Run Job
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onResetStudio}
        disabled={isRunning}
        size="lg"
      >
        Clear Workspace
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={downloadInFlight ? "Downloading artifacts" : downloadAriaLabel}
        title={downloadAriaLabel}
        disabled={!canDownloadArtifacts || downloadInFlight}
        onClick={() => {
          void onDownloadArtifacts();
        }}
      >
        {downloadInFlight ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </Button>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="API key settings"
              disabled={isRunning}
            />
          }
        >
          <Cog className="size-4" />
        </PopoverTrigger>

        <PopoverContent align="end" side="top" className="w-72 rounded-md p-3">
          <div className="space-y-2.5">
            <Label
              htmlFor="api-key"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              API Key (Optional)
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(event) => onSetApiKey(event.target.value)}
              placeholder="Use JWT if empty"
              autoComplete="off"
              spellCheck={false}
              className="rounded-md"
            />
            <div className="flex justify-end">
              <DeleteIconButton onClick={onClearApiKey} ariaLabel="Delete API key" />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isRunning && uploadProgress.total > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-3" aria-live="polite">
          <Progress value={(uploadProgress.done / uploadProgress.total) * 100} className="flex-1" />
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {uploadProgress.done}/{uploadProgress.total}
          </span>
        </div>
      ) : null}
    </div>
  );
}
