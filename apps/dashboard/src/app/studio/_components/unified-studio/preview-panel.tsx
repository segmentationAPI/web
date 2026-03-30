"use client";

import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/studio/studio-status-primitives";
import {
  useInputTasks,
  useInputType,
  useJobId,
  useOutputLinks,
  usePlaygroundMasks,
  useRefreshOutput,
  useSetOutputLinks,
} from "../../_store/studio.store";
import MediaPreview from "@/components/studio/media-preview";
import { getJobStatus, getOutputManifest } from "../../actions";
import { getStudioActionErrorMessage, hasTerminalStudioItems, extractManifestPreviewUrls } from "../../utils";

function EmptyPreview() {
  const jobId = useJobId();
  const refreshOutput = useRefreshOutput();
  const setOutputLinks = useSetOutputLinks();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshOutput = async () => {
    if (!jobId || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const latestStatus = await getJobStatus(jobId);
      refreshOutput(latestStatus);

      if (hasTerminalStudioItems(latestStatus)) {
        const outputManifest = await getOutputManifest(jobId);
        const previewUrls = extractManifestPreviewUrls(
          outputManifest.items.map((item) => item.previewUrl),
        );
        setOutputLinks(previewUrls);
      }
    } catch (error) {
      console.error(error);
      const message = getStudioActionErrorMessage("refresh", error);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Empty className="border-border/40 bg-muted/8 flex-1 rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <div className="bg-muted/30 flex size-14 items-center justify-center rounded-xl">
            <Sparkles className="text-primary/60 size-6" />
          </div>
        </EmptyMedia>
        {jobId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshOutput}
            className="mt-1 gap-2"
            aria-label="Refresh job status"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Refresh preview
              </>
            )}
          </Button>
        ) : (
          <EmptyTitle className="text-foreground/80">No preview yet</EmptyTitle>
        )}
        <EmptyDescription>Upload media and add prompts to get started.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const MASK_COLORS = [
  [255, 0, 0],
  [0, 128, 255],
  [0, 200, 0],
  [255, 165, 0],
  [160, 32, 240],
  [0, 200, 200],
  [255, 105, 180],
  [255, 255, 0],
] as const;

const MASK_OPACITY = 0.45;

function PlaygroundPreview({
  inputFile,
  masks,
}: {
  inputFile: File;
  masks: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const compositeImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || masks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inputImg = new Image();
    inputImg.src = URL.createObjectURL(inputFile);
    await new Promise<void>((resolve, reject) => {
      inputImg.onload = () => resolve();
      inputImg.onerror = () => reject(new Error("Failed to load input image"));
    });

    canvas.width = inputImg.naturalWidth;
    canvas.height = inputImg.naturalHeight;
    setCanvasSize({ width: inputImg.naturalWidth, height: inputImg.naturalHeight });

    ctx.drawImage(inputImg, 0, 0);
    URL.revokeObjectURL(inputImg.src);

    for (let i = 0; i < masks.length; i++) {
      const maskImg = new Image();
      maskImg.src = `data:image/png;base64,${masks[i]}`;
      await new Promise<void>((resolve, reject) => {
        maskImg.onload = () => resolve();
        maskImg.onerror = () => reject(new Error("Failed to load mask"));
      });

      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) continue;

      offCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

      const maskData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = maskData.data;
      const [r, g, b] = MASK_COLORS[i % MASK_COLORS.length];

      for (let p = 0; p < pixels.length; p += 4) {
        const brightness = pixels[p]!;
        if (brightness > 128) {
          pixels[p] = r;
          pixels[p + 1] = g;
          pixels[p + 2] = b;
          pixels[p + 3] = Math.round(255 * MASK_OPACITY);
        } else {
          pixels[p + 3] = 0;
        }
      }

      offCtx.putImageData(maskData, 0, 0);
      ctx.drawImage(offscreen, 0, 0);
    }
  }, [inputFile, masks]);

  useEffect(() => {
    void compositeImage();
  }, [compositeImage]);

  return (
    <canvas
      ref={canvasRef}
      className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
      width={canvasSize.width || undefined}
      height={canvasSize.height || undefined}
    />
  );
}

export function PreviewPanel({ isPlaygroundMode }: { isPlaygroundMode: boolean }) {
  const outputLinks = useOutputLinks();
  const inputType = useInputType();
  const playgroundMasks = usePlaygroundMasks();
  const inputTasks = useInputTasks();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasOutputs = outputLinks.length > 0;
  const hasMultipleOutputs = outputLinks.length > 1;
  const hasPlaygroundOutput = isPlaygroundMode && playgroundMasks.length > 0 && inputTasks.length > 0;

  useEffect(() => {
    if (selectedIndex >= outputLinks.length) {
      setSelectedIndex(0);
    }
  }, [outputLinks.length, selectedIndex]);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionLabel>Preview & Output</SectionLabel>
      </div>

      {hasPlaygroundOutput ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="border-border/50 bg-muted/10 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border p-3 sm:p-4">
            <PlaygroundPreview inputFile={inputTasks[0].file} masks={playgroundMasks} />
          </div>
          <div className="border-border/50 bg-background/70 flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              {playgroundMasks.length} {playgroundMasks.length === 1 ? "mask" : "masks"} overlaid
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {playgroundMasks.map((_, i) => {
                const [r, g, b] = MASK_COLORS[i % MASK_COLORS.length];
                return (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                    />
                    <span className="text-muted-foreground">Mask {i + 1}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : !hasOutputs ? (
        <EmptyPreview />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="border-border/50 bg-muted/10 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border p-3 sm:p-4">
            <MediaPreview assetUrl={outputLinks[selectedIndex]} mediaType={inputType ?? "image"} />
          </div>

          {hasMultipleOutputs ? (
            <div className="border-border/50 bg-background/70 flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                Output {selectedIndex + 1} of {outputLinks.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Show previous output"
                  onClick={() =>
                    setSelectedIndex((selectedIndex - 1 + outputLinks.length) % outputLinks.length)
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Show next output"
                  onClick={() => setSelectedIndex((selectedIndex + 1) % outputLinks.length)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
