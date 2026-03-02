"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  SegmentationClient,
  buildOutputManifestUrl,
  normalizeMaskArtifacts,
  normalizeVideoFrameMasks,
  resolveManifestResultForTask,
  resolveOutputFolder,
  type MaskArtifactResult,
  type VideoFrameMaskMap,
  type JobStatusResult,
  type JobType,
} from "@segmentationapi/sdk";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";

import { ImageCanvas } from "./image-canvas";
import { PromptInputList } from "./prompt-input-list";
import { StudioFileInput } from "./studio-file-input";
import { VideoCanvas } from "./video-canvas";
import type { BoxCoordinates } from "./studio-canvas-types";

type FileKind = "image" | "video" | "none";

type RunState = {
  jobId?: string;
  mode: "idle" | "running" | "ready";
  selectedType?: JobType;
};

type UnifiedStudioProps = {
  userId: string;
};

type PromptStateSnapshot = {
  cleanPrompts: string[];
};

type LoadedMaskEntry = {
  taskId: string;
  masks: MaskArtifactResult[];
  frameMasks: VideoFrameMaskMap;
};

const INITIAL_UPLOAD_PROGRESS = { done: 0, total: 0 };

function classifyFiles(files: File[]): FileKind {
  if (files.length === 0) return "none";
  const firstIsVideo = files[0]!.type.startsWith("video/");
  return firstIsVideo ? "video" : "image";
}

function isJobComplete(status: JobStatusResult["status"] | undefined) {
  return status === "completed" || status === "completed_with_errors" || status === "failed";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

async function getAuthedClient() {
  const { data: tokenData, error: tokenError } = await authClient.token();
  if (tokenError || !tokenData) {
    throw new Error(tokenError?.message ?? "Failed to authenticate.");
  }

  return new SegmentationClient({ jwt: tokenData.token });
}

function createEmptyMaskEntries(taskIds: string[]): LoadedMaskEntry[] {
  return taskIds.map((taskId) => ({
    taskId,
    masks: [],
    frameMasks: {},
  }));
}

async function loadMaskEntries(
  status: JobStatusResult,
  userId: string,
): Promise<LoadedMaskEntry[]> {
  const taskIds =
    status.items
      ?.filter((item) => item.status === "success")
      .map((item) => item.taskId) ?? [];

  if (taskIds.length === 0) {
    return [];
  }

  const fallbackEntries = createEmptyMaskEntries(taskIds);
  const manifestUrl = buildOutputManifestUrl(userId, status.jobId, resolveOutputFolder(status));

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      return fallbackEntries;
    }

    const manifest = (await response.json()) as unknown;
    return taskIds.map((taskId) => ({
      taskId,
      masks: normalizeMaskArtifacts(resolveManifestResultForTask(manifest, taskId), {
        userId,
        jobId: status.jobId,
        taskId,
      }),
      frameMasks: normalizeVideoFrameMasks(resolveManifestResultForTask(manifest, taskId), {
        userId,
        jobId: status.jobId,
        taskId,
      }),
    }));
  } catch {
    return fallbackEntries;
  }
}

export function UnifiedStudio({ userId }: UnifiedStudioProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [promptInputResetKey, setPromptInputResetKey] = useState(0);
  const [runState, setRunState] = useState<RunState>({ mode: "idle" });
  const [promptState, setPromptState] = useState<PromptStateSnapshot>({
    cleanPrompts: [],
  });
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>(
    INITIAL_UPLOAD_PROGRESS,
  );
  const [jobStatus, setJobStatus] = useState<JobStatusResult | null>(null);
  const [taskMasksByTaskId, setTaskMasksByTaskId] = useState<Record<string, MaskArtifactResult[]>>({});
  const [videoFrameMasksByTaskId, setVideoFrameMasksByTaskId] = useState<
    Record<string, VideoFrameMaskMap>
  >({});
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [batchCarouselIndex, setBatchCarouselIndex] = useState(0);

  const [boxes, setBoxes] = useState<BoxCoordinates[]>([]);

  const fileKind = useMemo(() => classifyFiles(files), [files]);

  const imageFiles = useMemo(
    () => files.filter((file) => file.type.startsWith("image/")),
    [files],
  );
  const firstVideoFile = useMemo(
    () => files.find((file) => file.type.startsWith("video/")) ?? null,
    [files],
  );

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

  const hasRequiredPrompt = promptState.cleanPrompts.length > 0;
  const hasPromptBoxParity =
    fileKind !== "image" || boxes.length === 0 || promptState.cleanPrompts.length === boxes.length;
  const canRun =
    runState.mode !== "running" &&
    fileKind !== "none" &&
    hasRequiredPrompt &&
    hasPromptBoxParity;
  const modeLabel =
    fileKind === "image" ? "Image Batch" : fileKind === "video" ? "Video" : "Select Files";
  const modeBadgeClass =
    fileKind === "image"
      ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
      : fileKind === "video"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : "border-border/60 bg-background/50 text-muted-foreground";

  const currentAsyncJobId = runState.jobId ?? null;
  const hasOutputs = runState.mode === "ready" && Boolean(currentAsyncJobId);
  const firstImagePreviewUrl = imagePreviewUrls[0] ?? null;
  const isImagePreviewMode = fileKind === "image" && Boolean(firstImagePreviewUrl);
  const isVideoPreviewMode = fileKind === "video" && Boolean(videoPreviewUrl);

  const progressText = jobStatus
    ? `${jobStatus.successItems + jobStatus.failedItems}/${jobStatus.totalItems}`
    : null;
  const batchItemCount = jobStatus?.items?.length ?? 0;
  const carouselIndex =
    batchItemCount > 0 ? Math.min(batchCarouselIndex, batchItemCount - 1) : 0;
  const activeBatchItem = jobStatus?.items?.[carouselIndex] ?? null;
  const batchImageUrl = imagePreviewUrls[carouselIndex] ?? imagePreviewUrls[0] ?? null;
  const activeVideoItemTaskId =
    jobStatus?.items?.find((item) => item.status === "success")?.taskId ??
    jobStatus?.items?.[0]?.taskId ??
    null;
  const activeVideoFrameMasks =
    activeVideoItemTaskId && videoFrameMasksByTaskId[activeVideoItemTaskId]
      ? videoFrameMasksByTaskId[activeVideoItemTaskId]
      : {};

  const resetAnnotations = useCallback(() => {
    setBoxes([]);
  }, []);

  const clearJobOutputs = useCallback(() => {
    setJobStatus(null);
    setTaskMasksByTaskId({});
    setVideoFrameMasksByTaskId({});
    setBatchCarouselIndex(0);
  }, []);

  const runVideoJob = useCallback(
    async (client: SegmentationClient) => {
      const videoFile = files[0];
      if (!videoFile) {
        throw new Error("Please select a video.");
      }

      return client.segmentVideo({
        file: videoFile,
        frameIdx: 0,
        fps: 2,
        maxFrames: 120,
        prompts: promptState.cleanPrompts,
      });
    },
    [files, promptState.cleanPrompts],
  );

  const runImageBatchJob = useCallback(
    async (client: SegmentationClient) => {
      if (imageFiles.length < 1) {
        throw new Error("Please select at least one image.");
      }

      return client.uploadAndCreateJob(
        {
          type: "image_batch",
          prompts: promptState.cleanPrompts.length > 0 ? promptState.cleanPrompts : undefined,
          boxes:
            boxes.length > 0
              ? boxes.map((coordinates) => ({
                  coordinates: [coordinates[0], coordinates[1], coordinates[2], coordinates[3]],
                  isPositive: true,
                }))
              : undefined,
          threshold: 0.5,
          maskThreshold: 0.5,
          files: imageFiles.map((file) => ({
            data: file,
            contentType: file.type || "image/png",
          })),
        },
        (done, total) => {
          setUploadProgress({ done, total });
        },
      );
    },
    [boxes, imageFiles, promptState.cleanPrompts],
  );

  const handleFilesChange = useCallback((nextFiles: File[]) => {
    setFiles(nextFiles);
    setRunState({ mode: "idle" });
    clearJobOutputs();
    resetAnnotations();
  }, [clearJobOutputs, resetAnnotations]);

  function resetStudio() {
    setFileInputResetKey((current) => current + 1);
    setPromptInputResetKey((current) => current + 1);
    setPromptState({ cleanPrompts: [] });
    setRunState({ mode: "idle" });
    setUploadProgress(INITIAL_UPLOAD_PROGRESS);
    clearJobOutputs();
    resetAnnotations();
  }

  const refreshJobStatus = useCallback(async (jobIdOverride?: string, silent = false) => {
    const targetJobId = jobIdOverride ?? currentAsyncJobId;
    if (!targetJobId || statusRefreshing) return;

    if (!silent) {
      setStatusRefreshing(true);
    }

    try {
      const client = await getAuthedClient();
      const status = await client.getSegmentJob({ jobId: targetJobId });
      setJobStatus(status);

      const loadedMasks = await loadMaskEntries(status, userId);
      if (loadedMasks.length > 0) {
        setTaskMasksByTaskId((current) => {
          const next = { ...current };
          for (const entry of loadedMasks) {
            next[entry.taskId] = entry.masks;
          }
          return next;
        });
        setVideoFrameMasksByTaskId((current) => {
          const next = { ...current };
          for (const entry of loadedMasks) {
            next[entry.taskId] = entry.frameMasks;
          }
          return next;
        });
      }

    } catch (error) {
      if (!silent) {
        console.error(error);
      }
    } finally {
      if (!silent) {
        setStatusRefreshing(false);
      }
    }
  }, [currentAsyncJobId, statusRefreshing, userId]);

  async function runJob() {
    if (!canRun) return;

    setRunState({ mode: "running", selectedType: fileKind === "video" ? "video" : "image_batch" });
    clearJobOutputs();

    try {
      const client = await getAuthedClient();
      const accepted =
        fileKind === "video"
          ? await runVideoJob(client)
          : await runImageBatchJob(client);
      setRunState({
        mode: "ready",
        selectedType: fileKind === "video" ? "video" : "image_batch",
        jobId: accepted.jobId,
      });
      setUploadProgress(INITIAL_UPLOAD_PROGRESS);
      await refreshJobStatus(accepted.jobId, true);
    } catch {
      setRunState({ mode: "idle" });
      setUploadProgress(INITIAL_UPLOAD_PROGRESS);
    }
  }

  // Get masks for single-image view from the first job status item
  const singleImageMasks = runState.mode === "ready" &&
    runState.selectedType === "image_batch" &&
    imageFiles.length === 1 &&
    jobStatus &&
    isJobComplete(jobStatus.status) &&
    jobStatus.items?.[0]?.taskId
    ? taskMasksByTaskId[jobStatus.items[0].taskId]
    : null;

  const isSingleImageView = imageFiles.length === 1;

  return (
    <section className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-4 sm:p-5">
      <div className="space-y-2 border-b border-border/40 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Studio
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm text-muted-foreground">
            {fileKind === "video"
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
            key={promptInputResetKey}
            mode={fileKind}
            boxCount={boxes.length}
            minPrompts={1}
            disabled={runState.mode === "running"}
            onStateChange={setPromptState}
          />

          <StudioFileInput onFilesChange={handleFilesChange} resetKey={fileInputResetKey} />

          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              disabled={!canRun}
              onClick={() => void runJob()}
              className="h-9 min-w-32 border border-primary/45 bg-primary/20 px-4 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
            >
              {runState.mode === "running" ? (
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
              disabled={runState.mode === "running" && uploadProgress.total > 0}
              className="h-9 px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              Clear
            </Button>
            {runState.mode === "running" && uploadProgress.total > 0 ? (
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

          {/* Single-image view with annotation canvas */}
          {isImagePreviewMode && isSingleImageView ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {singleImageMasks ? `${singleImageMasks.length} masks detected` : boxes.length > 0 ? `${boxes.length} objects selected` : "Draw bounding boxes to select objects"}
                </p>
                {boxes.length > 0 && !hasOutputs ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBoxes([])}
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
                onBoxAdded={(box) => setBoxes((prev) => [...prev, box])}
                masks={singleImageMasks ?? undefined}
              />
              {runState.mode === "ready" && runState.jobId && jobStatus ? (
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

          {/* Multi-image preview before run (input images only, never from S3) */}
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

          {/* Batch image (multi-image) results with carousel */}
          {runState.mode === "ready" &&
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
                      onClick={() => setBatchCarouselIndex((current) => Math.max(0, current - 1))}
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
                      onClick={() =>
                        setBatchCarouselIndex((current) =>
                          Math.min(batchItemCount - 1, current + 1),
                        )
                      }
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

          {/* Video preview before run */}
          {isVideoPreviewMode && !hasOutputs ? (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Prompt-driven video segmentation
              </p>
              <VideoCanvas src={videoPreviewUrl!} frameMasks={{}} />
            </div>
          ) : null}

          {/* Video results */}
          {runState.mode === "ready" &&
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
