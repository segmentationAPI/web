"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { decodeCocoRleMask, type MaskArtifactResult, type VideoMaskTimeline } from "@segmentationapi/sdk";
import NextImage from "next/image";

import { Skeleton } from "@/components/ui/skeleton";

type VideoCanvasProps = {
  src: string;
  timeline: VideoMaskTimeline;
};

const MASK_ALPHA = 110;
const MASK_IMAGE_ALPHA = 0.62;
const THUMBNAIL_WIDTH = 220;
const INSPECTOR_WIDTH = 960;

const MASK_COLORS: Array<[number, number, number]> = [
  [56, 189, 248],
  [34, 197, 94],
  [244, 114, 182],
  [250, 204, 21],
  [251, 146, 60],
];

type FrameEntry = {
  sampleIdx: number;
  timeSeconds: number;
  masks: MaskArtifactResult[];
  rasterMasks: MaskArtifactResult[];
  imageMasks: MaskArtifactResult[];
};

function splitMasks(masks: MaskArtifactResult[]) {
  const rasterMasks: MaskArtifactResult[] = [];
  const imageMasks: MaskArtifactResult[] = [];

  for (const mask of masks) {
    if (mask.rle) {
      rasterMasks.push(mask);
      continue;
    }
    if (mask.url) {
      imageMasks.push(mask);
    }
  }

  return { rasterMasks, imageMasks };
}

function getMaskColor(maskIndex: number) {
  const paletteIndex = ((maskIndex % MASK_COLORS.length) + MASK_COLORS.length) % MASK_COLORS.length;
  return MASK_COLORS[paletteIndex]!;
}

function drawRasterMasksToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sampleIdx: number,
  masks: MaskArtifactResult[],
  decodedRleCacheRef: MutableRefObject<Map<string, ReturnType<typeof decodeCocoRleMask>>>,
  renderedRasterMaskCacheRef: MutableRefObject<Map<string, HTMLCanvasElement>>,
) {
  if (masks.length === 0) {
    return;
  }

  const renderedMaskKey = `${sampleIdx}:${width}x${height}`;
  const cachedMaskCanvas = renderedRasterMaskCacheRef.current.get(renderedMaskKey);
  if (cachedMaskCanvas) {
    context.drawImage(cachedMaskCanvas, 0, 0, width, height);
    return;
  }

  const overlayCanvas = document.createElement("canvas");
  ensureCanvasSize(overlayCanvas, width, height);

  const overlayContext = overlayCanvas.getContext("2d");
  if (!overlayContext) {
    return;
  }

  const imageData = overlayContext.createImageData(width, height);
  const pixels = imageData.data;

  for (const mask of masks) {
    if (!mask.rle) {
      continue;
    }

    const cacheKey = `${sampleIdx}:${mask.maskIndex}`;
    let decodedMask = decodedRleCacheRef.current.get(cacheKey);
    if (!decodedMask) {
      decodedMask = decodeCocoRleMask(mask.rle);
      decodedRleCacheRef.current.set(cacheKey, decodedMask);
    }

    const [red, green, blue] = getMaskColor(mask.maskIndex);

    for (let y = 0; y < height; y += 1) {
      const sourceY = Math.min(decodedMask.height - 1, Math.floor((y * decodedMask.height) / height));
      const sourceRowOffset = sourceY * decodedMask.width;
      const targetRowOffset = y * width;

      for (let x = 0; x < width; x += 1) {
        const sourceX = Math.min(decodedMask.width - 1, Math.floor((x * decodedMask.width) / width));
        const sourceIndex = sourceRowOffset + sourceX;
        if (decodedMask.data[sourceIndex] === 0) {
          continue;
        }

        const pixelOffset = (targetRowOffset + x) * 4;
        pixels[pixelOffset] = red;
        pixels[pixelOffset + 1] = green;
        pixels[pixelOffset + 2] = blue;
        pixels[pixelOffset + 3] = MASK_ALPHA;
      }
    }
  }

  overlayContext.putImageData(imageData, 0, 0);
  renderedRasterMaskCacheRef.current.set(renderedMaskKey, overlayCanvas);
  context.drawImage(overlayCanvas, 0, 0, width, height);
}

function ensureCanvasSize(canvas: HTMLCanvasElement, width: number, height: number) {
  const nextWidth = Math.max(1, Math.floor(width));
  const nextHeight = Math.max(1, Math.floor(height));
  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
}

function waitForDecodedFrame(video: HTMLVideoElement): Promise<void> {
  if (typeof video.requestVideoFrameCallback === "function") {
    return new Promise((resolve) => {
      video.requestVideoFrameCallback(() => {
        resolve();
      });
    });
  }

  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function seekVideo(video: HTMLVideoElement, nextTimeSeconds: number): Promise<void> {
  const clamped = Math.max(0, Math.min(nextTimeSeconds, Number.isFinite(video.duration) ? video.duration : nextTimeSeconds));
  if (Math.abs(video.currentTime - clamped) < 0.0005) {
    await waitForDecodedFrame(video);
    return;
  }

  await new Promise<void>((resolve) => {
    const handleSeeked = () => {
      video.removeEventListener("seeked", handleSeeked);
      resolve();
    };

    video.addEventListener("seeked", handleSeeked, { once: true });
    video.currentTime = clamped;
  });

  await waitForDecodedFrame(video);
}

function loadImage(
  url: string,
  imageCacheRef: MutableRefObject<Map<string, HTMLImageElement>>,
  loadingImagePromisesRef: MutableRefObject<Map<string, Promise<HTMLImageElement>>>,
) {
  const cached = imageCacheRef.current.get(url);
  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = loadingImagePromisesRef.current.get(url);
  if (inFlight) {
    return inFlight;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageCacheRef.current.set(url, image);
      loadingImagePromisesRef.current.delete(url);
      resolve(image);
    };
    image.onerror = () => {
      loadingImagePromisesRef.current.delete(url);
      reject(new Error(`Failed to load mask image: ${url}`));
    };
    image.src = url;
  });

  loadingImagePromisesRef.current.set(url, promise);
  return promise;
}

function drawImageMasksToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  masks: MaskArtifactResult[],
  imageCacheRef: MutableRefObject<Map<string, HTMLImageElement>>,
  loadingImagePromisesRef: MutableRefObject<Map<string, Promise<HTMLImageElement>>>,
) {
  if (masks.length === 0) {
    return;
  }

  context.save();
  context.globalAlpha = MASK_IMAGE_ALPHA;
  context.globalCompositeOperation = "screen";

  for (const mask of masks) {
    const cachedMaskImage = imageCacheRef.current.get(mask.url);
    if (cachedMaskImage) {
      context.drawImage(cachedMaskImage, 0, 0, width, height);
      continue;
    }

    if (loadingImagePromisesRef.current.has(mask.url)) {
      continue;
    }

    void loadImage(mask.url, imageCacheRef, loadingImagePromisesRef).catch(() => {
      // Ignore individual mask image load failures and continue rendering the rest.
    });
  }

  context.restore();
}

async function renderCompositedFrameToCanvas({
  video,
  canvas,
  entry,
  decodedRleCacheRef,
  renderedRasterMaskCacheRef,
  imageCacheRef,
  loadingImagePromisesRef,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  entry: FrameEntry;
  decodedRleCacheRef: MutableRefObject<Map<string, ReturnType<typeof decodeCocoRleMask>>>;
  renderedRasterMaskCacheRef: MutableRefObject<Map<string, HTMLCanvasElement>>;
  imageCacheRef: MutableRefObject<Map<string, HTMLImageElement>>;
  loadingImagePromisesRef: MutableRefObject<Map<string, Promise<HTMLImageElement>>>;
}) {
  if (!Number.isFinite(video.videoWidth) || video.videoWidth <= 0 || !Number.isFinite(video.videoHeight) || video.videoHeight <= 0) {
    return;
  }

  await seekVideo(video, entry.timeSeconds);

  const aspectRatio = video.videoWidth / video.videoHeight;
  const canvasWidth = canvas.width > 0 ? canvas.width : INSPECTOR_WIDTH;
  const canvasHeight = Math.max(1, Math.floor(canvasWidth / Math.max(aspectRatio, 0.001)));
  ensureCanvasSize(canvas, canvasWidth, canvasHeight);

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  drawRasterMasksToCanvas(
    context,
    canvas.width,
    canvas.height,
    entry.sampleIdx,
    entry.rasterMasks,
    decodedRleCacheRef,
    renderedRasterMaskCacheRef,
  );
  drawImageMasksToCanvas(
    context,
    canvas.width,
    canvas.height,
    entry.imageMasks,
    imageCacheRef,
    loadingImagePromisesRef,
  );
}

export function VideoCanvas({ src, timeline }: VideoCanvasProps) {
  const inspectorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodedRleCacheRef = useRef<Map<string, ReturnType<typeof decodeCocoRleMask>>>(new Map());
  const renderedRasterMaskCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadingImagePromisesRef = useRef<Map<string, Promise<HTMLImageElement>>>(new Map());

  const frameEntries = useMemo<FrameEntry[]>(
    () =>
      [...timeline.frames]
        .sort((left, right) => left.sampleIdx - right.sampleIdx)
        .map((frame) => ({
          sampleIdx: frame.sampleIdx,
          timeSeconds: frame.timeSec,
          masks: frame.masks,
          ...splitMasks(frame.masks),
        })),
    [timeline],
  );

  const frameEntryBySampleIdx = useMemo(
    () =>
      new Map(
        frameEntries.map((entry) => [entry.sampleIdx, entry]),
      ),
    [frameEntries],
  );

  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number | null>(null);
  const [stripThumbnails, setStripThumbnails] = useState<Record<number, string>>({});
  const [loadingStripThumbnails, setLoadingStripThumbnails] = useState(false);
  const [loadingInspectorFrame, setLoadingInspectorFrame] = useState(false);

  useEffect(() => {
    decodedRleCacheRef.current.clear();
    renderedRasterMaskCacheRef.current.clear();
    imageCacheRef.current.clear();
    loadingImagePromisesRef.current.clear();
  }, [src, timeline]);

  useEffect(() => {
    const nextSelected = frameEntries[0]?.sampleIdx ?? null;
    setSelectedSampleIdx(nextSelected);
  }, [frameEntries]);

  useEffect(() => {
    if (frameEntries.length === 0) {
      setStripThumbnails({});
      setLoadingStripThumbnails(false);
      return;
    }

    let cancelled = false;
    setStripThumbnails({});
    setLoadingStripThumbnails(true);

    const previewVideo = document.createElement("video");
    previewVideo.src = src;
    previewVideo.preload = "auto";
    previewVideo.muted = true;
    previewVideo.playsInline = true;

    const thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = THUMBNAIL_WIDTH;

    const generate = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            previewVideo.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          const onError = () => {
            previewVideo.removeEventListener("error", onError);
            reject(new Error("Failed to load video metadata for thumbnails."));
          };
          previewVideo.addEventListener("loadedmetadata", onLoaded, { once: true });
          previewVideo.addEventListener("error", onError, { once: true });
        });

        const aspectRatio = previewVideo.videoWidth / Math.max(1, previewVideo.videoHeight);
        thumbnailCanvas.height = Math.max(1, Math.floor(THUMBNAIL_WIDTH / Math.max(aspectRatio, 0.001)));

        for (const entry of frameEntries) {
          if (cancelled) {
            return;
          }

          await renderCompositedFrameToCanvas({
            video: previewVideo,
            canvas: thumbnailCanvas,
            entry,
            decodedRleCacheRef,
            renderedRasterMaskCacheRef,
            imageCacheRef,
            loadingImagePromisesRef,
          });

          const dataUrl = thumbnailCanvas.toDataURL("image/jpeg", 0.75);
          setStripThumbnails((previous) => ({ ...previous, [entry.sampleIdx]: dataUrl }));
        }
      } catch {
        if (!cancelled) {
          setStripThumbnails({});
        }
      } finally {
        if (!cancelled) {
          setLoadingStripThumbnails(false);
        }
      }
    };

    void generate();

    return () => {
      cancelled = true;
      previewVideo.pause();
      previewVideo.removeAttribute("src");
      previewVideo.load();
    };
  }, [frameEntries, src]);

  useEffect(() => {
    const canvas = inspectorCanvasRef.current;
    if (!canvas || selectedSampleIdx === null) {
      return;
    }
    const selectedEntry = frameEntryBySampleIdx.get(selectedSampleIdx);
    if (!selectedEntry) {
      return;
    }

    let cancelled = false;
    setLoadingInspectorFrame(true);

    const previewVideo = document.createElement("video");
    previewVideo.src = src;
    previewVideo.preload = "auto";
    previewVideo.muted = true;
    previewVideo.playsInline = true;

    const renderSelected = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            previewVideo.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          const onError = () => {
            previewVideo.removeEventListener("error", onError);
            reject(new Error("Failed to load video metadata for inspector frame."));
          };
          previewVideo.addEventListener("loadedmetadata", onLoaded, { once: true });
          previewVideo.addEventListener("error", onError, { once: true });
        });

        if (cancelled) {
          return;
        }

        const aspectRatio = previewVideo.videoWidth / Math.max(1, previewVideo.videoHeight);
        ensureCanvasSize(
          canvas,
          INSPECTOR_WIDTH,
          Math.max(1, Math.floor(INSPECTOR_WIDTH / Math.max(aspectRatio, 0.001))),
        );

        await renderCompositedFrameToCanvas({
          video: previewVideo,
          canvas,
          entry: selectedEntry,
          decodedRleCacheRef,
          renderedRasterMaskCacheRef,
          imageCacheRef,
          loadingImagePromisesRef,
        });
      } catch {
        // no-op; we show an empty inspector if frame extraction fails
      } finally {
        if (!cancelled) {
          setLoadingInspectorFrame(false);
        }
      }
    };

    void renderSelected();

    return () => {
      cancelled = true;
      previewVideo.pause();
      previewVideo.removeAttribute("src");
      previewVideo.load();
    };
  }, [frameEntryBySampleIdx, selectedSampleIdx, src]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedSampleIdx === null ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted-foreground">
            No mask frames loaded yet.
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-background/80">
            <div className="flex h-full w-full items-center justify-center">
              <canvas
                ref={inspectorCanvasRef}
                className="h-auto max-h-full w-auto max-w-full"
              />
            </div>
            {loadingInspectorFrame ? (
              <Skeleton className="absolute inset-0 rounded-none" />
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Mask Samples ({frameEntries.length})
        </p>
        {frameEntries.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-5 text-xs text-muted-foreground">
            Run the job and refresh to load mask frames.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-gutter:stable]">
            {frameEntries.map((entry) => {
              const thumbnail = stripThumbnails[entry.sampleIdx];
              const isSelected = entry.sampleIdx === selectedSampleIdx;
              return (
                <button
                  key={entry.sampleIdx}
                  type="button"
                  onClick={() => setSelectedSampleIdx(entry.sampleIdx)}
                  className={`group shrink-0 cursor-pointer rounded-lg border transition-colors ${
                    isSelected
                      ? "border-primary/70 bg-primary/10"
                      : "border-border/60 bg-background/60 hover:border-primary/40"
                  }`}
                >
                  <div className="relative h-24 w-40 overflow-hidden rounded-t-lg bg-muted/30">
                    {thumbnail ? (
                      <NextImage
                        src={thumbnail}
                        alt={`Sample ${entry.sampleIdx}`}
                        width={160}
                        height={96}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Skeleton className="h-full w-full rounded-none" />
                    )}
                  </div>
                  <div className="space-y-0.5 px-2 py-1.5 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Sample {entry.sampleIdx}
                    </p>
                    <p className="text-[11px] text-foreground">
                      {entry.masks.length} masks
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {loadingStripThumbnails ? (
          <p className="text-xs text-muted-foreground">Generating frame previews...</p>
        ) : null}
      </div>
    </div>
  );
}
