"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeCocoRleMask, type MaskArtifactResult, type VideoFrameMaskMap } from "@segmentationapi/sdk";

type FrameSyncPolicy = "exact";

type VideoCanvasProps = {
  src: string;
  frameMasks: VideoFrameMaskMap;
  samplingFps?: number;
  frameSyncPolicy?: FrameSyncPolicy;
  onFrameChange?: (frame: number) => void;
};

const DEFAULT_SAMPLING_FPS = 2;
const MASK_ALPHA = 110;

const MASK_COLORS: Array<[number, number, number]> = [
  [56, 189, 248],
  [34, 197, 94],
  [244, 114, 182],
  [250, 204, 21],
  [251, 146, 60],
];

export function VideoCanvas({
  src,
  frameMasks,
  samplingFps,
  frameSyncPolicy = "exact",
  onFrameChange,
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodedRleCacheRef = useRef<Map<string, ReturnType<typeof decodeCocoRleMask>>>(new Map());

  const [currentFrame, setCurrentFrame] = useState(0);
  const [overlaySize, setOverlaySize] = useState({ width: 1, height: 1 });

  const resolvedSamplingFps = useMemo(() => {
    if (typeof samplingFps === "number" && Number.isFinite(samplingFps) && samplingFps > 0) {
      return samplingFps;
    }

    return DEFAULT_SAMPLING_FPS;
  }, [samplingFps]);

  const frameKeys = useMemo(
    () =>
      Object.keys(frameMasks)
        .map((key) => Number(key))
        .filter((key) => Number.isFinite(key) && key >= 0)
        .sort((left, right) => left - right),
    [frameMasks],
  );

  const activeMasks = useMemo(() => {
    if (frameSyncPolicy !== "exact") {
      return [];
    }

    return frameMasks[currentFrame] ?? [];
  }, [currentFrame, frameMasks, frameSyncPolicy]);

  const { rasterMasks, imageMasks } = useMemo(() => {
    const raster: MaskArtifactResult[] = [];
    const image: MaskArtifactResult[] = [];

    for (const mask of activeMasks) {
      if (mask.rle) {
        raster.push(mask);
      } else if (mask.url) {
        image.push(mask);
      }
    }

    return {
      rasterMasks: raster,
      imageMasks: image,
    };
  }, [activeMasks]);

  useEffect(() => {
    decodedRleCacheRef.current.clear();
  }, [src, frameMasks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const updateSize = () => {
      setOverlaySize({
        width: Math.max(1, Math.floor(video.clientWidth)),
        height: Math.max(1, Math.floor(video.clientHeight)),
      });
    };

    updateSize();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(updateSize) : null;
    observer?.observe(video);

    return () => {
      observer?.disconnect();
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const width = Math.max(1, overlaySize.width);
    const height = Math.max(1, overlaySize.height);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (rasterMasks.length === 0) {
      return;
    }

    const imageData = context.createImageData(width, height);
    const pixels = imageData.data;

    for (const mask of rasterMasks) {
      if (!mask.rle) {
        continue;
      }

      const cacheKey = `${currentFrame}:${mask.maskIndex}`;
      let decodedMask = decodedRleCacheRef.current.get(cacheKey);
      if (!decodedMask) {
        decodedMask = decodeCocoRleMask(mask.rle);
        decodedRleCacheRef.current.set(cacheKey, decodedMask);
      }

      const paletteIndex = ((mask.maskIndex % MASK_COLORS.length) + MASK_COLORS.length) % MASK_COLORS.length;
      const [red, green, blue] = MASK_COLORS[paletteIndex]!;

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

    context.putImageData(imageData, 0, 0);
  }, [currentFrame, overlaySize.height, overlaySize.width, rasterMasks]);

  const updateCurrentFrame = useCallback(
    (timeSeconds: number) => {
      const nextFrame = Math.max(0, Math.floor(timeSeconds * resolvedSamplingFps));
      setCurrentFrame(nextFrame);
      onFrameChange?.(nextFrame);
    },
    [onFrameChange, resolvedSamplingFps],
  );

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
        <video
          ref={videoRef}
          src={src}
          controls
          className="h-auto w-full"
          onLoadedMetadata={(event) => {
            updateCurrentFrame(event.currentTarget.currentTime);
          }}
          onTimeUpdate={(event) => {
            updateCurrentFrame(event.currentTarget.currentTime);
          }}
          onSeeked={(event) => {
            updateCurrentFrame(event.currentTarget.currentTime);
          }}
        />

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {imageMasks.length > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            {imageMasks.map((mask, index) => (
              <img
                key={`${mask.key}-${currentFrame}-${index}`}
                src={mask.url}
                alt={`Frame ${currentFrame} mask ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
              />
            ))}
          </div>
        ) : null}

      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Frame {currentFrame} · Loaded frames {frameKeys.length} · Masks in frame {activeMasks.length}
      </p>
    </div>
  );
}
