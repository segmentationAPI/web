"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import {
  SegmentationClient,
  type SegmentJobStatusResult,
  type SegmentResult,
} from "@segmentationapi/sdk";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type JobKind = "none" | "single-image" | "batch-image" | "video" | "mixed";

type RunState = {
  batchJobId?: string;
  maskCount?: number;
  mode: "idle" | "running" | "ready";
  selectedType?: JobKind;
  singleImageResult?: SegmentResult;
  videoJobId?: string;
};

function classifyFiles(files: File[]): JobKind {
  const imageCount = files.filter((f) => f.type.startsWith("image/")).length;
  const videoCount = files.filter((f) => f.type.startsWith("video/")).length;

  if (imageCount === 0 && videoCount === 0) return "none";
  if (imageCount > 0 && videoCount > 0) return "mixed";
  if (videoCount > 0) return "video";
  if (imageCount === 1) return "single-image";
  return "batch-image";
}

function trimPrompts(prompts: string[]) {
  return prompts.map((p) => p.trim()).filter(Boolean);
}

function fileKind(file: File) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "other";
}

function isJobComplete(status: SegmentJobStatusResult["status"] | undefined) {
  return status === "completed" || status === "completed_with_errors" || status === "failed";
}

async function getAuthedClient() {
  const { data: tokenData, error: tokenError } = await authClient.token();
  if (tokenError || !tokenData) {
    throw new Error(tokenError?.message ?? "Failed to authenticate.");
  }

  return new SegmentationClient({ jwt: tokenData.token });
}

async function getVideoCenterPoint(file: File): Promise<[number, number]> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const point = await new Promise<[number, number]>((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        resolve([
          Math.max(0, Math.floor(video.videoWidth / 2)),
          Math.max(0, Math.floor(video.videoHeight / 2)),
        ]);
      };

      video.onerror = () => {
        resolve([320, 180]);
      };
    });

    return point;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function UnifiedStudio() {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [runState, setRunState] = useState<RunState>({ mode: "idle" });
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [jobStatus, setJobStatus] = useState<SegmentJobStatusResult | null>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [batchCarouselIndex, setBatchCarouselIndex] = useState(0);

  // Bounding box state
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [boxes, setBoxes] = useState<number[][]>([]);
  const [currentBox, setCurrentBox] = useState<number[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const jobKind = useMemo(() => classifyFiles(files), [files]);
  const firstImage = useMemo(
    () => files.find((file) => file.type.startsWith("image/")) ?? null,
    [files],
  );

  const imagePreviewUrl = useMemo(() => {
    if (!firstImage) return null;
    return URL.createObjectURL(firstImage);
  }, [firstImage]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const batchImageFiles = useMemo(
    () => files.filter((file) => file.type.startsWith("image/")),
    [files],
  );
  const firstVideoFile = useMemo(
    () => files.find((file) => file.type.startsWith("video/")) ?? null,
    [files],
  );

  const batchImagePreviewUrls = useMemo(
    () => batchImageFiles.map((file) => URL.createObjectURL(file)),
    [batchImageFiles],
  );
  const videoPreviewUrl = useMemo(() => {
    if (!firstVideoFile) return null;
    return URL.createObjectURL(firstVideoFile);
  }, [firstVideoFile]);

  useEffect(() => {
    return () => {
      for (const url of batchImagePreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [batchImagePreviewUrls]);

  useEffect(() => {
    if (!videoPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const canRun =
    runState.mode !== "running" &&
    (jobKind === "single-image" || jobKind === "batch-image" || jobKind === "video");
  const modeLabel =
    jobKind === "single-image"
      ? "Single (Sync)"
      : jobKind === "batch-image"
        ? "Batch"
        : jobKind === "video"
          ? "Video"
          : jobKind === "mixed"
            ? "Mixed Unsupported"
            : "Select Files";
  const modeBadgeClass =
    jobKind === "single-image"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : jobKind === "batch-image"
        ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
        : jobKind === "video"
          ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
          : jobKind === "mixed"
            ? "border-destructive/45 bg-destructive/15 text-destructive"
            : "border-border/60 bg-background/50 text-muted-foreground";

  const currentAsyncJobId = runState.batchJobId ?? runState.videoJobId ?? null;
  const hasOutputs =
    runState.mode === "ready" &&
    ((runState.selectedType === "single-image" && Boolean(runState.singleImageResult)) ||
      ((runState.selectedType === "batch-image" || runState.selectedType === "video") &&
        Boolean(currentAsyncJobId)));
  const isPreviewMode = (jobKind === "single-image" || jobKind === "batch-image") && Boolean(imagePreviewUrl);

  const progressText = jobStatus
    ? `${jobStatus.successItems + jobStatus.failedItems}/${jobStatus.totalItems}`
    : null;
  const activeBatchItem = jobStatus?.items?.[batchCarouselIndex] ?? null;

  function replacePrompt(index: number, value: string) {
    const next = [...prompts];
    next[index] = value;
    setPrompts(next);
  }

  function resetBoxState() {
    setBoxes([]);
    setCurrentBox(null);
    setIsDrawing(false);
    setImageDims(null);
  }

  function onFilesSelected(next: FileList | null) {
    const selected = Array.from(next ?? []).filter((file) => {
      const kind = fileKind(file);
      return kind === "image" || kind === "video";
    });
    setFiles(selected);
    setRunState({ mode: "idle" });
    setJobStatus(null);
    setBatchCarouselIndex(0);
    resetBoxState();
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, idx) => idx !== index));
    setRunState({ mode: "idle" });
    setJobStatus(null);
    setBatchCarouselIndex(0);
    resetBoxState();
  }

  function resetStudio() {
    setPrompts([]);
    setFiles([]);
    setRunState({ mode: "idle" });
    setUploadProgress({ done: 0, total: 0 });
    setJobStatus(null);
    setBatchCarouselIndex(0);
    resetBoxState();
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

      if (!silent && isJobComplete(status.status)) {
        toast.success(`Job ${status.status.replaceAll("_", " ")}.`);
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

    const cleanPrompts = trimPrompts(prompts);
    setRunState({ mode: "running", selectedType: jobKind });
    setJobStatus(null);
    setBatchCarouselIndex(0);

    try {
      const client = await getAuthedClient();

      if (jobKind === "single-image") {
        const file = files.find((f) => f.type.startsWith("image/"));
        if (!file) throw new Error("Please select one image.");

        const result = await client.uploadAndSegment({
          prompts: cleanPrompts,
          boxes: boxes.length > 0 ? boxes : undefined,
          boxLabels: boxes.length > 0 ? boxes.map((_) => 1) : undefined,
          data: file,
          contentType: file.type || "image/png",
          threshold: 0.5,
          maskThreshold: 0.5,
        });

        setRunState({
          mode: "ready",
          selectedType: "single-image",
          singleImageResult: result,
          maskCount: result.masks.length,
        });
        setUploadProgress({ done: 0, total: 0 });
        toast.success("Image job completed.");
        return;
      }

      if (jobKind === "video") {
        const videoFiles = files.filter((f) => f.type.startsWith("video/"));
        if (videoFiles.length !== 1) {
          throw new Error("Video job requires exactly one video file.");
        }

        const [x, y] = await getVideoCenterPoint(videoFiles[0]!);
        const accepted = await client.segmentVideo({
          file: videoFiles[0]!,
          frameIdx: 0,
          fps: 2,
          maxFrames: 120,
          points: [[x, y]],
          pointLabels: [1],
          pointObjectIds: [1],
        });

        setRunState({
          mode: "ready",
          selectedType: "video",
          videoJobId: accepted.jobId,
        });
        setUploadProgress({ done: 0, total: 0 });
        toast.success("Video job submitted.");
        await refreshJobStatus(accepted.jobId, true);
        return;
      }

      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length < 2) {
        throw new Error("Batch job requires multiple images.");
      }

      setUploadProgress({ done: 0, total: imageFiles.length });
      const uploaded: string[] = [];

      for (let i = 0; i < imageFiles.length; i += 1) {
        const file = imageFiles[i]!;
        const contentType = file.type || "image/png";

        const presigned = await client.createPresignedUpload({ contentType });
        await client.uploadImage({
          uploadUrl: presigned.uploadUrl,
          data: file,
          contentType,
        });
        uploaded.push(presigned.inputS3Key);
        setUploadProgress({ done: i + 1, total: imageFiles.length });
      }

      const accepted = await client.createBatchSegmentJob({
        prompts: cleanPrompts,
        boxes: boxes.length > 0 ? boxes : undefined,
        boxLabels: boxes.length > 0 ? boxes.map((_) => 1) : undefined,
        threshold: 0.5,
        maskThreshold: 0.5,
        items: uploaded.map((inputS3Key) => ({ inputS3Key })),
      });

      setRunState({
        mode: "ready",
        selectedType: "batch-image",
        batchJobId: accepted.jobId,
      });
      setUploadProgress({ done: 0, total: 0 });
      toast.success("Batch job submitted.");
      await refreshJobStatus(accepted.jobId, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      setRunState({ mode: "idle" });
      setUploadProgress({ done: 0, total: 0 });
      toast.error(message);
    }
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageDims({ w: naturalWidth, h: naturalHeight });
  }

  function getMouseCoords(e: React.MouseEvent<HTMLDivElement>): [number, number] | null {
    if (!imageRef.current || !imageDims) return null;
    const rect = imageRef.current.getBoundingClientRect();
    
    // Calculate the mouse position relative to the image element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates to the original image dimensions
    const scaleX = imageDims.w / rect.width;
    const scaleY = imageDims.h / rect.height;
    
    const imageX = Math.round(x * scaleX);
    const imageY = Math.round(y * scaleY);
    
    return [
      Math.max(0, Math.min(imageX, imageDims.w)),
      Math.max(0, Math.min(imageY, imageDims.h))
    ];
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const coords = getMouseCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setCurrentBox([coords[0], coords[1], coords[0], coords[1]]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDrawing || !currentBox) return;
    const coords = getMouseCoords(e);
    if (!coords) return;
    setCurrentBox([currentBox[0], currentBox[1], coords[0], coords[1]]);
  }

  function handleMouseUp() {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);
    
    // Only add if it's an actual box (width > 5 & height > 5 to avoid accidental clicks)
    const x1 = Math.min(currentBox[0], currentBox[2]);
    const y1 = Math.min(currentBox[1], currentBox[3]);
    const x2 = Math.max(currentBox[0], currentBox[2]);
    const y2 = Math.max(currentBox[1], currentBox[3]);

    if (x2 - x1 > 5 && y2 - y1 > 5) {
      setBoxes((current) => [...current, [x1, y1, x2, y2]]);
    }
    setCurrentBox(null);
  }

  function renderBox(box: number[], key: string, isDrawing = false) {
    if (!imageDims) return null;
    
    const x1 = Math.min(box[0], box[2]);
    const y1 = Math.min(box[1], box[3]);
    const x2 = Math.max(box[0], box[2]);
    const y2 = Math.max(box[1], box[3]);
    
    const left = (x1 / imageDims.w) * 100;
    const top = (y1 / imageDims.h) * 100;
    const width = ((x2 - x1) / imageDims.w) * 100;
    const height = ((y2 - y1) / imageDims.h) * 100;

    return (
      <div
        key={key}
        className={`absolute border-2 pointer-events-none ${isDrawing ? 'border-primary border-dashed bg-primary/10' : 'border-emerald-500 bg-emerald-500/20'}`}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      />
    );
  }

  return (
    <section className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-4 sm:p-5">
      <div className="space-y-2 border-b border-border/40 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Studio
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm text-muted-foreground">
            Add prompts and files, then run.
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
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Prompts (Optional)
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
          </div>

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
                    className="flex items-center justify-between rounded-lg border border-border/55 bg-muted/20 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-foreground">{file.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {file.type.startsWith("image/") ? "image" : "video"} · {(file.size / 1024).toFixed(1)} KB
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

            {jobKind === "mixed" ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-destructive">
                Mixed image + video submission is not supported yet. Select one type per run.
              </p>
            ) : null}
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
                {jobStatus.status.replaceAll("_", " ")} · {progressText}
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

          {!hasOutputs && !isPreviewMode ? (
            <Empty className="mt-2 border-0 bg-transparent p-0 text-left">
              <EmptyHeader className="items-start">
                <EmptyTitle className="text-sm">No output yet</EmptyTitle>
                <EmptyDescription className="text-sm">
                  Results will appear here after a successful run.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {isPreviewMode ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {runState.mode === "ready" && runState.singleImageResult ? `${runState.maskCount ?? 0} masks detected` : boxes.length > 0 ? `${boxes.length} objects selected` : 'Draw bounding boxes to select objects'}
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
              <div 
                className={`relative overflow-hidden rounded-lg border border-border/60 select-none ${!hasOutputs ? 'cursor-crosshair' : ''}`}
                onMouseDown={!hasOutputs ? handleMouseDown : undefined}
                onMouseMove={!hasOutputs ? handleMouseMove : undefined}
                onMouseUp={!hasOutputs ? handleMouseUp : undefined}
                onMouseLeave={!hasOutputs ? handleMouseUp : undefined}
              >
                <img 
                  ref={imageRef}
                  src={imagePreviewUrl!} 
                  alt="Selected" 
                  className="h-auto w-full pointer-events-none" 
                  draggable={false}
                  onLoad={handleImageLoad}
                />
                
                {runState.mode === "ready" && runState.singleImageResult?.masks.map((mask, index) => (
                  <img
                    key={`${mask.key}-${index}`}
                    src={mask.url}
                    alt={`Mask ${index + 1}`}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
                  />
                ))}

                {!hasOutputs && boxes.map((box, index) => renderBox(box, `box-${index}`))}
                {!hasOutputs && currentBox && renderBox(currentBox, 'current-box', true)}
              </div>
            </div>
          ) : null}

          {runState.mode === "ready" &&
          runState.selectedType === "batch-image" &&
          runState.batchJobId ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Batch job: {runState.batchJobId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {jobStatus?.status.replaceAll("_", " ") ?? "queued"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Progress: {progressText ?? "0/0"}
                </p>
              </div>

              {activeBatchItem ? (
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-lg border border-border/60">
                    {batchImagePreviewUrls[batchCarouselIndex] ? (
                      <img
                        src={batchImagePreviewUrls[batchCarouselIndex]}
                        alt={`Batch input ${batchCarouselIndex + 1}`}
                        className="h-auto w-full"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                    {activeBatchItem.masks?.map((mask, index) => (
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
                      {batchCarouselIndex + 1}/{jobStatus?.items?.length ?? 1} · {activeBatchItem.status}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={batchCarouselIndex >= (jobStatus?.items?.length ?? 1) - 1}
                      onClick={() =>
                        setBatchCarouselIndex((current) =>
                          Math.min((jobStatus?.items?.length ?? 1) - 1, current + 1),
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

          {runState.mode === "ready" &&
          runState.selectedType === "video" &&
          runState.videoJobId ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Video job: {runState.videoJobId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {jobStatus?.status.replaceAll("_", " ") ?? "queued"}
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

              {jobStatus?.video?.counts ? (
                <div className="grid gap-2 rounded-lg border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <p>Frames: {jobStatus.video.counts.framesProcessed}</p>
                  <p>With masks: {jobStatus.video.counts.framesWithMasks}</p>
                  <p>Masks: {jobStatus.video.counts.totalMasks}</p>
                </div>
              ) : null}

              {jobStatus?.video?.output ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <a
                    href={jobStatus.video.output.framesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline"
                  >
                    Frames URL
                  </a>
                  <p className="break-all">{jobStatus.video.output.outputS3Prefix}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No video output metadata yet. Refresh to check.</p>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
