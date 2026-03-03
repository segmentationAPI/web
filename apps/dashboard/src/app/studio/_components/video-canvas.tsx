"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { decodeCocoRleMask, type MaskArtifactResult, type VideoMaskTimeline } from "@segmentationapi/sdk";
import NextImage from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { type VideoPreviewMode } from "../_store/studio-selectors";

type VideoCanvasProps = {
  src: string;
  timeline: VideoMaskTimeline;
  mode: VideoPreviewMode;
};

const MASK_ALPHA = 110;
const MASK_IMAGE_ALPHA = 0.62;
const THUMBNAIL_WIDTH = 220;
const INSPECTOR_WIDTH = 960;
export const TIMELINE_MATCH_EPSILON_SECONDS = 1 / 300;

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
  rasterOverlayCanvasRef: MutableRefObject<HTMLCanvasElement | null>,
) {
  if (masks.length === 0) {
    return;
  }

  const overlayCanvas = rasterOverlayCanvasRef.current ?? document.createElement("canvas");
  rasterOverlayCanvasRef.current = overlayCanvas;
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

async function drawImageMasksToCanvas(
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

  const loadedMasks = await Promise.allSettled(
    masks.map((mask) =>
      loadImage(mask.url, imageCacheRef, loadingImagePromisesRef).then((image) => ({ image })),
    ),
  );

  context.save();
  context.globalAlpha = MASK_IMAGE_ALPHA;
  context.globalCompositeOperation = "screen";

  for (const loadedMask of loadedMasks) {
    if (loadedMask.status !== "fulfilled") {
      continue;
    }

    const { image } = loadedMask.value;
    context.drawImage(image, 0, 0, width, height);
  }

  context.restore();
}

function findExactTimelineFrame(
  frames: FrameEntry[],
  timeSeconds: number,
  epsilonSeconds = TIMELINE_MATCH_EPSILON_SECONDS,
): FrameEntry | null {
  for (const frame of frames) {
    if (Math.abs(frame.timeSeconds - timeSeconds) <= epsilonSeconds) {
      return frame;
    }
  }
  return null;
}

async function renderCompositedFrameToCanvas({
  video,
  canvas,
  entry,
  decodedRleCacheRef,
  rasterOverlayCanvasRef,
  imageCacheRef,
  loadingImagePromisesRef,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  entry: FrameEntry;
  decodedRleCacheRef: MutableRefObject<Map<string, ReturnType<typeof decodeCocoRleMask>>>;
  rasterOverlayCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
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

  const { rasterMasks, imageMasks } = splitMasks(entry.masks);
  drawRasterMasksToCanvas(
    context,
    canvas.width,
    canvas.height,
    entry.sampleIdx,
    rasterMasks,
    decodedRleCacheRef,
    rasterOverlayCanvasRef,
  );
  await drawImageMasksToCanvas(
    context,
    canvas.width,
    canvas.height,
    imageMasks,
    imageCacheRef,
    loadingImagePromisesRef,
  );
}

export function VideoCanvas({ src, timeline, mode }: VideoCanvasProps) {
  const smoothVideoRef = useRef<HTMLVideoElement | null>(null);
  const smoothCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inspectorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodedRleCacheRef = useRef<Map<string, ReturnType<typeof decodeCocoRleMask>>>(new Map());
  const rasterOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadingImagePromisesRef = useRef<Map<string, Promise<HTMLImageElement>>>(new Map());
  const renderFrameRequestRef = useRef<number | null>(null);
  const videoFrameCallbackHandleRef = useRef<number | null>(null);

  const frameEntries = useMemo<FrameEntry[]>(
    () =>
      [...timeline.frames]
        .sort((left, right) => left.sampleIdx - right.sampleIdx)
        .map((frame) => ({
          sampleIdx: frame.sampleIdx,
          timeSeconds: frame.timeSec,
          masks: frame.masks,
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
  const [currentSampleIdx, setCurrentSampleIdx] = useState<number | null>(null);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number | null>(null);
  const [stripThumbnails, setStripThumbnails] = useState<Record<number, string>>({});
  const [loadingStripThumbnails, setLoadingStripThumbnails] = useState(false);
  const [loadingInspectorFrame, setLoadingInspectorFrame] = useState(false);

  useEffect(() => {
    decodedRleCacheRef.current.clear();
    rasterOverlayCanvasRef.current = null;
    imageCacheRef.current.clear();
    loadingImagePromisesRef.current.clear();
  }, [src, timeline]);

  useEffect(() => {
    const nextSelected = frameEntries[0]?.sampleIdx ?? null;
    setSelectedSampleIdx(nextSelected);
  }, [frameEntries]);

  const renderSmoothFrame = useCallback(async (mediaTime?: number) => {
    const video = smoothVideoRef.current;
    const canvas = smoothCanvasRef.current;
    if (!video || !canvas) {
      return;
    }

    const width = Math.max(1, Math.floor(video.clientWidth));
    const height = Math.max(1, Math.floor(video.clientHeight));
    ensureCanvasSize(canvas, width, height);

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const playbackTime = typeof mediaTime === "number" && Number.isFinite(mediaTime) ? mediaTime : video.currentTime;
    const activeEntry = findExactTimelineFrame(frameEntries, playbackTime);
    setCurrentSampleIdx(activeEntry?.sampleIdx ?? null);
    if (!activeEntry) {
      return;
    }

    const { rasterMasks, imageMasks } = splitMasks(activeEntry.masks);

    drawRasterMasksToCanvas(
      context,
      canvas.width,
      canvas.height,
      activeEntry.sampleIdx,
      rasterMasks,
      decodedRleCacheRef,
      rasterOverlayCanvasRef,
    );
    await drawImageMasksToCanvas(
      context,
      canvas.width,
      canvas.height,
      imageMasks,
      imageCacheRef,
      loadingImagePromisesRef,
    );
  }, [frameEntries]);

  useEffect(() => {
    if (mode !== "smooth_playback") {
      return;
    }

    const video = smoothVideoRef.current;
    if (!video) {
      return;
    }

    const cancelVideoFrameLoop = () => {
      if (typeof video.cancelVideoFrameCallback === "function" && videoFrameCallbackHandleRef.current !== null) {
        video.cancelVideoFrameCallback(videoFrameCallbackHandleRef.current);
        videoFrameCallbackHandleRef.current = null;
      }
      if (renderFrameRequestRef.current !== null) {
        cancelAnimationFrame(renderFrameRequestRef.current);
        renderFrameRequestRef.current = null;
      }
    };

    const tickWithVideoFrameCallback = () => {
      if (typeof video.requestVideoFrameCallback !== "function") {
        return;
      }

      const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
        void renderSmoothFrame(metadata.mediaTime);
        if (!video.paused && !video.ended) {
          videoFrameCallbackHandleRef.current = video.requestVideoFrameCallback(onFrame);
        }
      };

      videoFrameCallbackHandleRef.current = video.requestVideoFrameCallback(onFrame);
    };

    const tickWithAnimationFrame = () => {
      const loop = () => {
        void renderSmoothFrame();
        if (!video.paused && !video.ended) {
          renderFrameRequestRef.current = requestAnimationFrame(loop);
        }
      };
      renderFrameRequestRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      cancelVideoFrameLoop();
      if (typeof video.requestVideoFrameCallback === "function") {
        tickWithVideoFrameCallback();
      } else {
        tickWithAnimationFrame();
      }
    };

    const renderCurrentFrame = () => {
      void renderSmoothFrame();
    };

    video.addEventListener("loadedmetadata", renderCurrentFrame);
    video.addEventListener("seeked", renderCurrentFrame);
    video.addEventListener("pause", renderCurrentFrame);
    video.addEventListener("ended", renderCurrentFrame);
    video.addEventListener("play", startLoop);
    window.addEventListener("resize", renderCurrentFrame);
    renderCurrentFrame();

    return () => {
      video.removeEventListener("loadedmetadata", renderCurrentFrame);
      video.removeEventListener("seeked", renderCurrentFrame);
      video.removeEventListener("pause", renderCurrentFrame);
      video.removeEventListener("ended", renderCurrentFrame);
      video.removeEventListener("play", startLoop);
      window.removeEventListener("resize", renderCurrentFrame);
      cancelVideoFrameLoop();
    };
  }, [mode, renderSmoothFrame]);

  useEffect(() => {
    if (mode !== "frame_inspector" || frameEntries.length === 0) {
      setStripThumbnails({});
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
            rasterOverlayCanvasRef,
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
  }, [frameEntries, mode, src]);

  useEffect(() => {
    if (mode !== "frame_inspector") {
      return;
    }

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
          rasterOverlayCanvasRef,
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
  }, [frameEntryBySampleIdx, mode, selectedSampleIdx, src]);

  const selectedFrameMaskCount =
    selectedSampleIdx === null ? 0 : (frameEntryBySampleIdx.get(selectedSampleIdx)?.masks.length ?? 0);
  const currentEntry = currentSampleIdx === null ? null : frameEntryBySampleIdx.get(currentSampleIdx) ?? null;

  return (
    <div className="space-y-3">
      {mode === "smooth_playback" ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
            <video
              ref={smoothVideoRef}
              src={src}
              controls
              className="h-auto w-full"
            />
            <canvas
              ref={smoothCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Smooth playback · Sample {currentEntry?.sampleIdx ?? "-"} · Loaded samples {frameEntries.length} · Masks in sample{" "}
            {currentEntry?.masks.length ?? 0}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-2.5">
            {selectedSampleIdx === null ? (
              <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
                No mask frames loaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background/80">
                  <canvas
                    ref={inspectorCanvasRef}
                    className="h-auto w-full"
                  />
                  {loadingInspectorFrame ? (
                    <Skeleton className="absolute inset-0 rounded-none" />
                  ) : null}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Sample {selectedSampleIdx} · Masks {selectedFrameMaskCount}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Mask Samples ({frameEntries.length})
            </p>
            {frameEntries.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-5 text-xs text-muted-foreground">
                Run the job and refresh to load mask frames.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {frameEntries.map((entry) => {
                  const thumbnail = stripThumbnails[entry.sampleIdx];
                  const isSelected = entry.sampleIdx === selectedSampleIdx;
                  return (
                    <button
                      key={entry.sampleIdx}
                      type="button"
                      onClick={() => setSelectedSampleIdx(entry.sampleIdx)}
                      className={`group shrink-0 rounded-lg border transition-colors ${
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
      )}
    </div>
  );
}
