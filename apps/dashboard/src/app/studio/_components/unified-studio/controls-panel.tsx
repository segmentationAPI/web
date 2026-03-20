"use client";

import { Film, ImageIcon, Plus, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SectionDivider, SectionLabel } from "@/components/studio/studio-status-primitives";
import {
  useAddFiles,
  useAddPrompt,
  useInputTasks,
  useFps,
  useInputType,
  useMaxFps,
  usePrompts,
  useRemoveFile,
  useRemovePrompt,
  useSetFps,
  useSetPrompt,
  useStatus,
} from "../../_store/studio.store";
import { isStudioJobRunning } from "../../utils";

const FILE_INPUT_ID = "studio-file-input";

export function ControlsPanel({ isPlaygroundMode }: { isPlaygroundMode: boolean }) {
  const inputType = useInputType();
  const prompts = usePrompts();
  const setPrompt = useSetPrompt();
  const removePrompt = useRemovePrompt();
  const addPrompt = useAddPrompt();
  const inputTasks = useInputTasks();
  const addFiles = useAddFiles();
  const removeFile = useRemoveFile();
  const status = useStatus();
  const fps = useFps();
  const maxFps = useMaxFps();
  const setFps = useSetFps();

  const isRunning = isStudioJobRunning(status);
  const hasReachedPlaygroundLimit = isPlaygroundMode && inputTasks.length >= 1;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFpsInputId = "video-fps";
  const videoFpsHintId = "video-fps-hint";

  return (
    <div className="border-border/30 flex flex-col overflow-y-auto border-b xl:border-r xl:border-b-0">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Prompts</SectionLabel>
        </div>

        <div className="space-y-2">
          {prompts.map((prompt, index) => {
            const inputId = `studio-prompt-${index}`;

            return (
              <div key={index} className="group flex items-center gap-1.5">
                <Label htmlFor={inputId} className="sr-only">
                  Prompt {index + 1}
                </Label>
                <Input
                  id={inputId}
                  name={inputId}
                  value={prompt}
                  onChange={(event) => setPrompt(index, event.target.value)}
                  placeholder="Describe the output…"
                  autoComplete="off"
                  disabled={isRunning}
                  className="rounded-md"
                />
                <DeleteIconButton
                  onClick={() => removePrompt(index)}
                  disabled={prompts.length <= 1 || isRunning}
                  ariaLabel={`Delete prompt ${index + 1}`}
                  className={`size-6 shrink-0 transition-opacity ${
                    prompts.length > 1 ? "opacity-70 hover:opacity-100" : "opacity-0"
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
          onClick={addPrompt}
          disabled={isRunning}
          className="w-full"
        >
          <Plus className="size-3" />
          Add Prompt
        </Button>
      </div>

      <SectionDivider />

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <SectionLabel>Assets</SectionLabel>
          {inputTasks.length > 0 ? (
            <span className="text-muted-foreground/60 font-mono text-[10px] tabular-nums">
              {inputTasks.length} file{inputTasks.length > 1 ? "s" : ""}
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
          multiple={!isPlaygroundMode}
          name="studio-assets"
          accept={isPlaygroundMode ? "image/*" : "image/*,video/*"}
          onChange={(event) => {
            if (!event.target.files) return;

            void addFiles(event.target.files).then((result) => {
              if (result.addedCount > 0) {
                toast.success(
                  result.addedCount === 1
                    ? "1 file added to the studio"
                    : `${result.addedCount} files added to the studio`,
                );
              }

              for (const error of result.errors) {
                toast.error(error);
              }
            });
            event.currentTarget.value = "";
          }}
          className="hidden"
        />

        {inputTasks.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group border-border/50 bg-muted/10 hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-primary/40 flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-lg border border-dashed px-4 py-6 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Upload media files"
          >
            <div className="bg-muted/30 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary flex size-10 items-center justify-center rounded-lg transition-colors">
              <Upload className="size-4" />
            </div>
            <div className="text-center">
              <p className="text-foreground/80 text-xs font-medium">
                {isPlaygroundMode ? "Upload image" : "Upload media"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {isPlaygroundMode ? "Single image only" : "Images or video"}
              </p>
            </div>
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="max-h-48 space-y-1 overflow-y-auto pr-0.5">
              {inputTasks.map((task, index) => (
                <div
                  key={`${task.file.name}-${index}`}
                  className="group bg-muted/20 hover:bg-muted/35 flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors"
                >
                  <div className="bg-muted/40 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                    {task.file.type.startsWith("video/") ? (
                      <Film className="size-3" />
                    ) : (
                      <ImageIcon className="size-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground/90 truncate text-xs">{task.file.name}</p>
                    <p className="text-muted-foreground/60 font-mono text-[10px]">
                      {(task.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <DeleteIconButton
                    onClick={() => removeFile(index)}
                    disabled={isRunning}
                    ariaLabel={`Delete file ${task.file.name}`}
                    className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              ))}
            </div>
            {!hasReachedPlaygroundLimit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRunning}
                className="text-muted-foreground w-full"
              >
                <Plus className="size-3" />
                Add files
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {inputType === "video" ? (
        <>
          <SectionDivider />
          <div className="space-y-3 p-4 sm:p-5">
            <SectionLabel>Video Processing</SectionLabel>
            <p id={videoFpsHintId} className="text-muted-foreground text-[11px] leading-relaxed">
              Sample {fps} frame{fps === 1 ? "" : "s"} per second.
            </p>

            <div className="space-y-2">
              <Label
                htmlFor={videoFpsInputId}
                className="text-muted-foreground font-mono text-[10px] tracking-[0.12em] uppercase"
              >
                Processing FPS
              </Label>

              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={maxFps}
                  value={[fps]}
                  step={1}
                  disabled={isRunning}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    if (typeof next === "number" && Number.isFinite(next)) {
                      setFps(Math.floor(next));
                    }
                  }}
                  className="flex-1 [&_[data-slot=slider-thumb]]:rounded-full [&_[data-slot=slider-track]]:rounded-full"
                />

                <Input
                  id={videoFpsInputId}
                  name={videoFpsInputId}
                  type="number"
                  min={1}
                  max={maxFps}
                  value={String(fps)}
                  disabled={isRunning}
                  autoComplete="off"
                  inputMode="numeric"
                  aria-describedby={videoFpsHintId}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(value)) {
                      setFps(Math.min(Math.max(value, 1), maxFps));
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
