"use client";

import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";

import {
  FileKind,
  StudioRunMode,
  classifyFiles,
  formatStatus,
  selectActiveBatchItem,
  selectActiveVideoFrameMasks,
  selectBatchImageUrl,
  selectBatchItemCount,
  selectCanRun,
  selectCarouselIndex,
  selectCurrentAsyncJobId,
  selectFirstVideoFile,
  selectFirstImagePreviewUrl,
  selectHasOutputs,
  selectImageFiles,
  selectIsImagePreviewMode,
  selectIsSingleImageView,
  selectIsVideoPreviewMode,
  selectProgressText,
  selectSingleImageMasks,
} from "../_store/studio-selectors";
import { useStudioStore } from "../_store/use-studio-store";
import { ImageCanvas } from "./image-canvas";
import { PromptInputList } from "./prompt-input-list";
import { StudioFileInput } from "./studio-file-input";
import { VideoCanvas } from "./video-canvas";

type UnifiedStudioProps = {
  userId: string;
};

export function UnifiedStudio({ userId }: UnifiedStudioProps) {
  const setUserId = useStudioStore((state) => state.setUserId);
  const files = useStudioStore((state) => state.files);
  const prompts = useStudioStore((state) => state.prompts);
  const boxes = useStudioStore((state) => state.boxes);
  const runState = useStudioStore((state) => state.runState);
  const uploadProgress = useStudioStore((state) => state.uploadProgress);
  const jobStatus = useStudioStore((state) => state.jobStatus);
  const taskMasksByTaskId = useStudioStore((state) => state.taskMasksByTaskId);
  const videoFrameMasksByTaskId = useStudioStore((state) => state.videoFrameMasksByTaskId);
  const statusRefreshing = useStudioStore((state) => state.statusRefreshing);
  const batchCarouselIndex = useStudioStore((state) => state.batchCarouselIndex);

  const setFiles = useStudioStore((state) => state.setFiles);
  const setPrompts = useStudioStore((state) => state.setPrompts);
  const addBox = useStudioStore((state) => state.addBox);
  const clearBoxes = useStudioStore((state) => state.clearBoxes);
  const setBatchCarouselIndex = useStudioStore((state) => state.setBatchCarouselIndex);
  const refreshJobStatus = useStudioStore((state) => state.refreshJobStatus);
  const runJob = useStudioStore((state) => state.runJob);
  const resetStudio = useStudioStore((state) => state.resetStudio);
  const canRun = useStudioStore(selectCanRun);

  useEffect(() => {
    setUserId(userId);
  }, [setUserId, userId]);

  const fileKind = useMemo(() => classifyFiles(files), [files]);
  const imageFiles = useMemo(() => selectImageFiles({ files }), [files]);
  const firstVideoFile = useMemo(() => selectFirstVideoFile({ files }), [files]);

  const imagePreviewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );
  const videoPreviewUrl = useMemo(() => {
    if (!firstVideoFile) return null;
    return URL.createObjectURL(firstVideoFile);
  }, [firstVideoFile]);

  useEffect(() => {
    return () => {
      for (const url of imagePreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    if (!videoPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const modeLabel =
    fileKind === FileKind.Image
      ? "Image Batch"
      : fileKind === FileKind.Video
        ? "Video"
        : "Select Files";
  const modeBadgeClass =
    fileKind === FileKind.Image
      ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
      : fileKind === FileKind.Video
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : "border-border/60 bg-background/50 text-muted-foreground";

  const currentAsyncJobId = selectCurrentAsyncJobId({ runState });
  const hasOutputs = selectHasOutputs({ runState });
  const firstImagePreviewUrl = selectFirstImagePreviewUrl(imagePreviewUrls);
  const isImagePreviewMode = selectIsImagePreviewMode(fileKind, firstImagePreviewUrl);
  const isVideoPreviewMode = selectIsVideoPreviewMode(fileKind, videoPreviewUrl);

  const progressText = selectProgressText({ jobStatus });
  const batchItemCount = selectBatchItemCount({ jobStatus });
  const carouselIndex = selectCarouselIndex({ jobStatus }, batchCarouselIndex);
  const activeBatchItem = selectActiveBatchItem({ jobStatus }, batchCarouselIndex);
  const batchImageUrl = selectBatchImageUrl(imagePreviewUrls, carouselIndex);
  const activeVideoFrameMasks = selectActiveVideoFrameMasks({
    jobStatus,
    videoFrameMasksByTaskId,
  });

  const singleImageMasks = selectSingleImageMasks(
    {
      runState,
      jobStatus,
      taskMasksByTaskId,
    },
    imageFiles,
  );

  const isSingleImageView = selectIsSingleImageView(imageFiles);

  return (
    <section className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-4 sm:p-5">
      <div className="space-y-2 border-b border-border/40 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Studio
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm text-muted-foreground">
            {fileKind === FileKind.Video
              ? "Add prompts, then run video segmentation."
              : "Add prompts and files, then run. If boxes are used, provide one prompt per box."}
          </p>
          <Badge
            variant="outline"
            className={`h-7 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] shadow-sm sm:justify-self-end ${modeBadgeClass}`}
          >
            {modeLabel}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <div className="space-y-4">
          <PromptInputList
            mode={fileKind}
            boxCount={boxes.length}
            prompts={prompts}
            onPromptsChange={setPrompts}
            minPrompts={1}
            disabled={runState.mode === StudioRunMode.Running}
          />

          <StudioFileInput files={files} onFilesChange={setFiles} />

          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              disabled={!canRun}
              onClick={() => void runJob()}
              className="h-9 min-w-32 border border-primary/45 bg-primary/20 px-4 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
            >
              {runState.mode === StudioRunMode.Running ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Running
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Run Job
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetStudio}
              disabled={runState.mode === StudioRunMode.Running && uploadProgress.total > 0}
              className="h-9 px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              Clear
            </Button>
            {runState.mode === StudioRunMode.Running && uploadProgress.total > 0 ? (
              <div className="w-full max-w-sm space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                  Uploading {uploadProgress.done}/{uploadProgress.total}
                </p>
                <Progress
                  value={(uploadProgress.done / uploadProgress.total) * 100}
                  className="gap-0"
                />
              </div>
            ) : null}
            {currentAsyncJobId && jobStatus ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                {formatStatus(jobStatus.status)} · {progressText}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="rounded-xl border border-border/55 bg-background/35 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Output</p>
            {currentAsyncJobId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshJobStatus()}
                disabled={statusRefreshing}
                className="h-8 px-2.5 font-mono text-[10px] uppercase tracking-[0.11em]"
              >
                <RefreshCw className={`size-3.5 ${statusRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : null}
          </div>

          {!hasOutputs && !isImagePreviewMode && !isVideoPreviewMode ? (
            <Empty className="mt-2 border-0 bg-transparent p-0 text-left">
              <EmptyHeader className="items-start">
                <EmptyTitle className="text-sm">No output yet</EmptyTitle>
                <EmptyDescription className="text-sm">
                  Results will appear here after a successful run.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {isImagePreviewMode && isSingleImageView ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {singleImageMasks
                    ? `${singleImageMasks.length} masks detected`
                    : boxes.length > 0
                      ? `${boxes.length} objects selected`
                      : "Draw bounding boxes to select objects"}
                </p>
                {boxes.length > 0 && !hasOutputs ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearBoxes}
                    className="h-6 px-2 text-[10px] uppercase font-mono tracking-[0.11em] text-muted-foreground hover:text-destructive"
                  >
                    Clear Boxes
                  </Button>
                ) : null}
              </div>
              <ImageCanvas
                src={firstImagePreviewUrl!}
                alt="Selected"
                readOnly={hasOutputs}
                boxes={hasOutputs ? [] : boxes}
                onBoxAdded={addBox}
                masks={singleImageMasks ?? undefined}
              />
              {runState.mode === StudioRunMode.Ready && runState.jobId && jobStatus ? (
                <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Job: {runState.jobId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status: {formatStatus(jobStatus.status)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isImagePreviewMode && !isSingleImageView && !hasOutputs && firstImagePreviewUrl ? (
            <div className="mt-3 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {imageFiles.length} images selected · Run job to process
              </p>
              <div className="relative overflow-hidden rounded-lg border border-border/60">
                <img
                  src={firstImagePreviewUrl}
                  alt="First of batch"
                  className="h-auto w-full"
                />
              </div>
            </div>
          ) : null}

          {runState.mode === StudioRunMode.Ready &&
          runState.selectedType === "image_batch" &&
          !isSingleImageView &&
          runState.jobId ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Batch job: {runState.jobId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {jobStatus ? formatStatus(jobStatus.status) : "queued"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Progress: {progressText ?? "0/0"}
                </p>
              </div>

              {activeBatchItem ? (
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-lg border border-border/60">
                    {batchImageUrl ? (
                      <img
                        src={batchImageUrl}
                        alt={`Batch input ${batchCarouselIndex + 1}`}
                        className="h-auto w-full"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                    {(taskMasksByTaskId[activeBatchItem.taskId] ?? []).map((mask, index) => (
                      <img
                        key={`${mask.key}-${index}`}
                        src={mask.url}
                        alt={`Batch mask ${index + 1}`}
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={carouselIndex <= 0}
                      onClick={() => setBatchCarouselIndex(Math.max(0, carouselIndex - 1))}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {carouselIndex + 1}/{batchItemCount} · {activeBatchItem.status}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={carouselIndex >= batchItemCount - 1}
                      onClick={() => setBatchCarouselIndex(Math.min(batchItemCount - 1, carouselIndex + 1))}
                      className="h-8 px-2"
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No batch output yet. Refresh to check progress.</p>
              )}
            </div>
          ) : null}

          {isVideoPreviewMode && !hasOutputs ? (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Prompt-driven video segmentation
              </p>
              <VideoCanvas src={videoPreviewUrl!} frameMasks={{}} />
            </div>
          ) : null}

          {runState.mode === StudioRunMode.Ready &&
          runState.selectedType === "video" &&
          runState.jobId ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Video job: {runState.jobId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {jobStatus ? formatStatus(jobStatus.status) : "queued"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Progress: {progressText ?? "0/0"}
                </p>
              </div>

              {videoPreviewUrl ? (
                <VideoCanvas
                  src={videoPreviewUrl}
                  frameMasks={activeVideoFrameMasks}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Video preview unavailable.</p>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
