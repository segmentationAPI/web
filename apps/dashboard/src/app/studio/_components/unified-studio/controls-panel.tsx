import { Film, ImageIcon, Plus, Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { ErrorBanner, SectionDivider, SectionLabel } from "./studio-ui-primitives";
import { useStudioControlsViewModel } from "./use-studio-view-model";

const FILE_INPUT_ID = "studio-file-input";

export function ControlsPanel() {
  const {
    files,
    promptRows,
    boxCount,
    isRunning,
    cleanPromptCount,
    hasPromptParityIssue,
    hasAttemptedEmptyPromptSubmit,
    promptPlaceholder,
    showVideoControls,
    videoFpsParseState,
    videoFpsParseError,
    videoFpsRange,
    videoFpsStatusText,
    onPromptChange,
    onAddPromptRow,
    onRemovePromptRow,
    onFileSelection,
    onRemoveFile,
    onSetVideoSamplingFps,
  } = useStudioControlsViewModel();

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col overflow-y-auto border-b border-border/30 xl:border-r xl:border-b-0">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Prompts</SectionLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
            {cleanPromptCount} active
          </span>
        </div>

        <div className="space-y-2">
          {promptRows.map((promptRow, index) => {
            const inputId = `studio-prompt-${promptRow.id}`;

            return (
              <div key={promptRow.id} className="group flex items-center gap-1.5">
                <Label htmlFor={inputId} className="sr-only">
                  Prompt {index + 1}
                </Label>
                <Input
                  id={inputId}
                  value={promptRow.value}
                  onChange={(event) => onPromptChange(promptRow.id, event.target.value)}
                  placeholder={promptPlaceholder}
                  disabled={isRunning}
                  className="rounded-md"
                />
                <DeleteIconButton
                  onClick={() => onRemovePromptRow(promptRow.id)}
                  disabled={promptRows.length <= 1 || isRunning}
                  ariaLabel={`Delete prompt ${index + 1}`}
                  className={`size-6 shrink-0 transition-opacity ${
                    promptRows.length > 1 ? "opacity-70 hover:opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddPromptRow}
          disabled={isRunning}
          className="w-full"
        >
          <Plus className="size-3" />
          Add Prompt
        </Button>

        {hasAttemptedEmptyPromptSubmit && cleanPromptCount < 1 ? (
          <p className="text-[11px] text-destructive">Add at least one prompt.</p>
        ) : null}

        {hasPromptParityIssue ? (
          <p className="text-[11px] text-destructive">
            Prompt count must match selected boxes ({cleanPromptCount}/{boxCount}).
          </p>
        ) : null}
      </div>

      <SectionDivider />

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Assets</SectionLabel>
          {files.length > 0 ? (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
              {files.length} file{files.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <Label htmlFor={FILE_INPUT_ID} className="sr-only">
          Upload image or video files
        </Label>
        <input
          id={FILE_INPUT_ID}
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(event) => {
            onFileSelection(event.target.files);
            event.currentTarget.value = "";
          }}
          className="hidden"
        />

        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 py-6 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Upload media files"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
              <Upload className="size-4" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-foreground/80">Upload media</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Images or video</p>
            </div>
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="max-h-48 space-y-1 overflow-y-auto pr-0.5">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="group flex items-center gap-2.5 rounded-md bg-muted/20 px-2.5 py-2 transition-colors hover:bg-muted/35"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
                    {file.type.startsWith("video/") ? (
                      <Film className="size-3" />
                    ) : (
                      <ImageIcon className="size-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-foreground/90">{file.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/60">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <DeleteIconButton
                    onClick={() => onRemoveFile(index)}
                    disabled={isRunning}
                    ariaLabel={`Delete file ${file.name}`}
                    className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning}
              className="w-full text-muted-foreground"
            >
              <Plus className="size-3" />
              Replace files
            </Button>
          </div>
        )}
      </div>

      {showVideoControls ? (
        <>
          <SectionDivider />
          <div className="space-y-3 p-4 sm:p-5">
            <SectionLabel>Video Processing</SectionLabel>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{videoFpsStatusText}</p>

            {videoFpsParseError ? <ErrorBanner message={videoFpsParseError} /> : null}

            <div className="space-y-2">
              <Label
                htmlFor="video-fps"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Processing FPS
              </Label>

              <div className="flex items-center gap-3">
                <Slider
                  min={videoFpsRange.min}
                  max={Math.max(videoFpsRange.min + 1, videoFpsRange.max ?? videoFpsRange.min + 1)}
                  value={[videoFpsRange.value]}
                  step={1}
                  disabled={
                    videoFpsParseState !== "ready" ||
                    isRunning ||
                    (videoFpsRange.max ?? videoFpsRange.min) <= videoFpsRange.min
                  }
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    if (typeof next === "number" && Number.isFinite(next)) {
                      onSetVideoSamplingFps(Math.floor(next));
                    }
                  }}
                  className="flex-1 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-track]]:rounded-full"
                />

                <Input
                  id="video-fps"
                  type="number"
                  min={videoFpsRange.min}
                  max={videoFpsRange.max ?? undefined}
                  value={String(videoFpsRange.value)}
                  disabled={videoFpsParseState !== "ready" || isRunning}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(value)) {
                      onSetVideoSamplingFps(value);
                    }
                  }}
                  className="w-16 rounded-md text-center"
                />
              </div>
            </div>

          </div>
        </>
      ) : null}
    </div>
  );
}
