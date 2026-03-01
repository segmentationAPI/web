"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  SegmentationClient,
  normalizeMaskArtifacts,
  type JobStatusResult,
  type JobType,
} from "@segmentationapi/sdk";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { AnnotationCanvas } from "./annotation-canvas";
import { useVideoFrame } from "./use-video-frame";

type FileKind = "image" | "video" | "none";
type AnnotationMode = "box" | "point";
type BoxCoordinates = [number, number, number, number];
type PointCoordinates = [number, number];

type RunState = {
  jobId?: string;
  mode: "idle" | "running" | "ready";
  selectedType?: JobType;
};

type ManifestMask = {
  key: string;
  url: string;
  score?: number;
  box?: [number, number, number, number];
};

type UnifiedStudioProps = {
  userId: string;
};

function classifyFiles(files: File[]): FileKind {
  if (files.length === 0) return "none";
  const firstIsVideo = files[0]!.type.startsWith("video/");
  return firstIsVideo ? "video" : "image";
}

function trimPrompts(prompts: string[]) {
  return prompts.map((p) => p.trim()).filter(Boolean);
}

function isJobComplete(status: JobStatusResult["status"] | undefined) {
  return status === "completed" || status === "completed_with_errors" || status === "failed";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function normalizeManifestMasks(
  result: unknown,
  context: { userId: string; jobId: string; taskId: string },
): ManifestMask[] {
  return normalizeMaskArtifacts(result, context).map((mask) => ({
    key: `${mask.key}#${mask.maskIndex}`,
    url: mask.url,
    score: mask.score ?? undefined,
    box: mask.box ?? undefined,
  }));
}

function toBoxCoordinates(value: number[]): BoxCoordinates | null {
  if (value.length !== 4) {
    return null;
  }

  const [x1, y1, x2, y2] = value;
  return [x1, y1, x2, y2];
}

function toPointCoordinates(value: number[]): PointCoordinates | null {
  if (value.length !== 2) {
    return null;
  }

  const [x, y] = value;
  return [x, y];
}

async function getAuthedClient() {
  const { data: tokenData, error: tokenError } = await authClient.token();
  if (tokenError || !tokenData) {
    throw new Error(tokenError?.message ?? "Failed to authenticate.");
  }

  return new SegmentationClient({ jwt: tokenData.token });
}

function buildOutputManifestUrl(userId: string, jobId: string, outputFolder?: string): string {
  const account = userId.trim();
  const job = jobId.trim();
  const explicitOutputFolder = outputFolder?.trim().replace(/^\/+|\/+$/g, "");
  const baseKey = explicitOutputFolder && explicitOutputFolder.length > 0
    ? explicitOutputFolder
    : `outputs/${account}/${job}`;
  const key = `${baseKey}/output_manifest.json`;
  return `https://assets.segmentationapi.com/${key}`;
}

function resolveOutputFolder(status: JobStatusResult): string | undefined {
  const outputFolder = (status.raw as { outputFolder?: unknown }).outputFolder;
  return typeof outputFolder === "string" && outputFolder.trim().length > 0
    ? outputFolder
    : undefined;
}

function resolveManifestResultForTask(manifest: unknown, taskId: string): unknown {
  if (!manifest || typeof manifest !== "object") {
    return undefined;
  }

  const root = manifest as {
    result?: unknown;
    items?: Record<string, { result?: unknown } | undefined>;
  };

  if (root.items && typeof root.items === "object") {
    const entry = root.items[taskId];
    if (entry && typeof entry === "object" && "result" in entry) {
      return entry.result;
    }
  }

  return root.result;
}

export function UnifiedStudio({ userId }: UnifiedStudioProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [runState, setRunState] = useState<RunState>({ mode: "idle" });
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [jobStatus, setJobStatus] = useState<JobStatusResult | null>(null);
  const [taskMasksByTaskId, setTaskMasksByTaskId] = useState<Record<string, ManifestMask[]>>({});
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [batchCarouselIndex, setBatchCarouselIndex] = useState(0);

  const [boxes, setBoxes] = useState<BoxCoordinates[]>([]);
  const [points, setPoints] = useState<PointCoordinates[]>([]);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>("point");

  const fileKind = useMemo(() => classifyFiles(files), [files]);

  const imageFiles = useMemo(
    () => files.filter((file) => file.type.startsWith("image/")),
    [files],
  );
  const firstVideoFile = useMemo(
    () => files.find((file) => file.type.startsWith("video/")) ?? null,
    [files],
  );
  const videoFrameUrl = useVideoFrame(firstVideoFile);

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

  const hasAnnotations = boxes.length > 0 || points.length > 0;
  const cleanPrompts = useMemo(() => trimPrompts(prompts), [prompts]);
  const requiresPromptBoxParity = fileKind === "image" && boxes.length > 0;
  const hasPromptBoxParity = !requiresPromptBoxParity || cleanPrompts.length === boxes.length;
  const canRun =
    runState.mode !== "running" &&
    fileKind !== "none" &&
    (fileKind === "image" || hasAnnotations) &&
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
  const activeBatchItem = jobStatus?.items?.[batchCarouselIndex] ?? null;
  const batchImageUrl = imagePreviewUrls[batchCarouselIndex] ?? imagePreviewUrls[0] ?? null;
  const batchItemCount = jobStatus?.items?.length ?? 0;

  function replacePrompt(index: number, value: string) {
    const next = [...prompts];
    next[index] = value;
    setPrompts(next);
  }

  function resetAnnotations() {
    setBoxes([]);
    setPoints([]);
    setAnnotationMode("point");
  }

  function onFilesSelected(next: FileList | null) {
    const accepted = Array.from(next ?? []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    let selected: File[];
    if (accepted.length === 0) {
      selected = [];
    } else if (accepted[0]!.type.startsWith("video/")) {
      const first = accepted.find((f) => f.type.startsWith("video/"));
      selected = first ? [first] : [];
    } else {
      selected = accepted.filter((f) => f.type.startsWith("image/"));
    }
    setFiles(selected);
    setPrompts(accepted[0]?.type.startsWith("video/") ? [] : prompts);
    setRunState({ mode: "idle" });
    setJobStatus(null);
    setTaskMasksByTaskId({});
    setBatchCarouselIndex(0);
    resetAnnotations();
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, idx) => idx !== index));
    setRunState({ mode: "idle" });
    setJobStatus(null);
    setTaskMasksByTaskId({});
    setBatchCarouselIndex(0);
    resetAnnotations();
  }

  function resetStudio() {
    setPrompts([]);
    setFiles([]);
    setRunState({ mode: "idle" });
    setUploadProgress({ done: 0, total: 0 });
    setJobStatus(null);
    setTaskMasksByTaskId({});
    setBatchCarouselIndex(0);
    resetAnnotations();
  }

  async function refreshJobStatus(jobIdOverride?: string, silent = false) {
    const targetJobId = jobIdOverride ?? currentAsyncJobId;
    if (!targetJobId || statusRefreshing) return;

    if (!silent) {
      setStatusRefreshing(true);
    }

    try {
      const client = await getAuthedClient();
      const status = await client.getSegmentJob({ jobId: targetJobId });
      setJobStatus(status);

      if (status.items?.length) {
        const fetchableItems = status.items.filter((item) => item.status === "success");

        if (fetchableItems.length > 0) {
          const manifestUrl = buildOutputManifestUrl(userId, status.jobId, resolveOutputFolder(status));
          let loadedMasks: Array<{ taskId: string; masks: ManifestMask[] }>;

          try {
            const response = await fetch(manifestUrl, { cache: "no-store" });
            if (!response.ok) {
              loadedMasks = fetchableItems.map((item) => ({
                taskId: item.taskId,
                masks: [],
              }));
            } else {
              const manifest = (await response.json()) as unknown;
              loadedMasks = fetchableItems.map((item) => ({
                taskId: item.taskId,
                masks: normalizeManifestMasks(resolveManifestResultForTask(manifest, item.taskId), {
                  userId,
                  jobId: status.jobId,
                  taskId: item.taskId,
                }),
              }));
            }
          } catch {
            loadedMasks = fetchableItems.map((item) => ({
              taskId: item.taskId,
              masks: [],
            }));
          }

          setTaskMasksByTaskId((current) => {
            const next = { ...current };
            for (const entry of loadedMasks) {
              next[entry.taskId] = entry.masks;
            }
            return next;
          });
        }
      }

      if (!silent && isJobComplete(status.status)) {
        toast.success(`Job ${formatStatus(status.status)}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh job status.";
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setStatusRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!currentAsyncJobId || !jobStatus) {
      return;
    }

    if (isJobComplete(jobStatus.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshJobStatus(currentAsyncJobId, true);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentAsyncJobId, jobStatus]);

  useEffect(() => {
    const itemCount = jobStatus?.items?.length ?? 0;
    if (itemCount === 0) {
      setBatchCarouselIndex(0);
      return;
    }

    if (batchCarouselIndex > itemCount - 1) {
      setBatchCarouselIndex(itemCount - 1);
    }
  }, [batchCarouselIndex, jobStatus?.items?.length]);

  async function runJob() {
    if (!canRun) return;

    if (fileKind === "image" && boxes.length > 0 && cleanPrompts.length !== boxes.length) {
      toast.error(`Prompt count must match box count (${cleanPrompts.length}/${boxes.length}).`);
      return;
    }

    setRunState({ mode: "running", selectedType: fileKind === "video" ? "video" : "image_batch" });
    setJobStatus(null);
    setTaskMasksByTaskId({});
    setBatchCarouselIndex(0);

    try {
      const client = await getAuthedClient();

      if (fileKind === "video") {
        const videoFile = files[0];
        if (!videoFile) {
          throw new Error("Please select a video.");
        }

        const baseOpts = {
          file: videoFile,
          frameIdx: 0,
          fps: 2,
          maxFrames: 120,
        } as const;

        const accepted =
          boxes.length > 0
            ? await client.segmentVideo({
                ...baseOpts,
                boxes: boxes.map((coordinates, i) => ({
                  coordinates,
                  isPositive: true,
                  objectId: i + 1,
                })),
              })
            : await client.segmentVideo({
                ...baseOpts,
                points: points.map((coordinates, i) => ({
                  coordinates,
                  isPositive: true,
                  objectId: i + 1,
                })),
              });

        setRunState({
          mode: "ready",
          selectedType: "video",
          jobId: accepted.jobId,
        });
        setUploadProgress({ done: 0, total: 0 });
        toast.success("Video job submitted.");
        await refreshJobStatus(accepted.jobId, true);
        return;
      }

      // Image batch (1 or more images)
      if (imageFiles.length < 1) {
        throw new Error("Please select at least one image.");
      }

      const accepted = await client.uploadAndCreateJob(
        {
          type: "image_batch",
          prompts: cleanPrompts.length > 0 ? cleanPrompts : undefined,
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

      setRunState({
        mode: "ready",
        selectedType: "image_batch",
        jobId: accepted.jobId,
      });
      setUploadProgress({ done: 0, total: 0 });
      toast.success("Image job submitted.");
      await refreshJobStatus(accepted.jobId, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      setRunState({ mode: "idle" });
      setUploadProgress({ done: 0, total: 0 });
      toast.error(message);
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
              ? "Select objects on the first frame, then run."
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
          {fileKind !== "video" ? (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Prompts {boxes.length > 0 ? "(Required: one per box)" : "(Optional)"}
              </p>
              {prompts.map((prompt, index) => (
                <div key={`prompt-${index}`} className="flex items-center gap-2">
                  <Input
                    value={prompt}
                    onChange={(event) => replacePrompt(index, event.target.value)}
                    placeholder="object to segment (optional)"
                    className="h-9 w-full rounded-lg border-input bg-background/65 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => setPrompts((current) => current.filter((_, i) => i !== index))}
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setPrompts((current) => [...current, ""])}
                className="h-8 w-fit rounded-lg border-border/70 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Add Prompt
              </Button>
              {boxes.length > 0 && !hasPromptBoxParity ? (
                <p className="text-xs text-destructive">
                  Prompt count must match box count ({cleanPrompts.length}/{boxes.length}).
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Assets</p>
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(event) => onFilesSelected(event.target.files)}
              className="h-10 cursor-pointer rounded-lg border-input bg-background/65 file:mr-2 file:rounded-md file:border file:border-input file:bg-muted/60 file:px-2.5"
            />

            {files.length > 0 ? (
              <div className="max-h-[270px] space-y-2 overflow-y-auto pr-1">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border/55 bg-muted/20 px-2.5 py-2"
                  >
                    {fileKind === "image" ? (
                      <img
                        src={imagePreviewUrls[index]}
                        alt=""
                        className="size-12 shrink-0 rounded-md border border-border/50 object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground">
                        <span className="font-mono text-[9px]">VID</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-foreground">{file.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {fileKind === "image" ? "image" : "video"} · {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-7 px-2 text-muted-foreground"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty className="rounded-lg border-border/55 bg-muted/10 px-3 py-4">
                <EmptyHeader>
                  <EmptyTitle className="text-xs">No assets selected</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Drop or select images/video to start a segmentation run.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              disabled={!canRun}
              onClick={() => void runJob()}
              className="h-9 min-w-[130px] border border-primary/45 bg-primary/20 px-4 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
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
              <AnnotationCanvas
                src={firstImagePreviewUrl!}
                alt="Selected"
                readOnly={hasOutputs}
                mode="box"
                boxes={hasOutputs ? [] : boxes}
                points={[]}
                onBoxAdded={(box) => {
                  const nextBox = toBoxCoordinates(box);
                  if (!nextBox) {
                    return;
                  }

                  setBoxes((prev) => [...prev, nextBox]);
                }}
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
                      disabled={batchCarouselIndex <= 0}
                      onClick={() => setBatchCarouselIndex((current) => Math.max(0, current - 1))}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {batchCarouselIndex + 1}/{batchItemCount} · {activeBatchItem.status}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={batchCarouselIndex >= batchItemCount - 1}
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

          {/* Video annotation on first frame */}
          {isVideoPreviewMode && !hasOutputs ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {annotationMode === "box"
                    ? boxes.length > 0 ? `${boxes.length} boxes drawn` : "Draw boxes on first frame"
                    : points.length > 0 ? `${points.length} points placed` : "Click to place points"}
                </p>
                <div className="flex items-center gap-1">
                  {hasAnnotations ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetAnnotations}
                      className="h-6 px-2 text-[10px] uppercase font-mono tracking-[0.11em] text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </Button>
                  ) : null}
                  <div className="flex overflow-hidden rounded-lg border border-border/60">
                    <Button
                      type="button"
                      variant={annotationMode === "point" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => { setAnnotationMode("point"); setBoxes([]); }}
                      className="h-6 rounded-none px-2 text-[10px] uppercase font-mono tracking-[0.11em]"
                    >
                      Points
                    </Button>
                    <Button
                      type="button"
                      variant={annotationMode === "box" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => { setAnnotationMode("box"); setPoints([]); }}
                      className="h-6 rounded-none px-2 text-[10px] uppercase font-mono tracking-[0.11em]"
                    >
                      Boxes
                    </Button>
                  </div>
                </div>
              </div>
              {videoFrameUrl ? (
                <AnnotationCanvas
                  src={videoFrameUrl}
                  alt="Video first frame"
                  mode={annotationMode}
                  boxes={boxes}
                  points={points}
                  onBoxAdded={(box) => {
                    const nextBox = toBoxCoordinates(box);
                    if (!nextBox) {
                      return;
                    }

                    setBoxes((prev) => [...prev, nextBox]);
                  }}
                  onPointAdded={(pt) => {
                    const nextPoint = toPointCoordinates(pt);
                    if (!nextPoint) {
                      return;
                    }

                    setPoints((prev) => [...prev, nextPoint]);
                  }}
                />
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-border/60 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading first frame…
                </div>
              )}
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
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full overflow-hidden rounded-xl border border-border/70 bg-background/80"
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
