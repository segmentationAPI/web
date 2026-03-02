"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeCocoRleMask, type VideoFrameMaskMap } from "@segmentationapi/sdk";

type VideoCanvasProps = {
  src: string;
  frameMasks: VideoFrameMaskMap;
  fps?: number;
  onFrameChange?: (frame: number) => void;
};

function toPercent(value: number) {
  return `${Math.max(0, Math.min(100, value * 100))}%`;
}

export function VideoCanvas({
  src,
  frameMasks,
  fps,
  onFrameChange,
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const frameKeys = useMemo(
    () => Object.keys(frameMasks).map((key) => Number(key)).filter(Number.isFinite),
    [frameMasks],
  );

  const maxFrameIndex = useMemo(() => {
    if (frameKeys.length === 0) {
      return 0;
    }

    return Math.max(...frameKeys);
  }, [frameKeys]);

  const resolvedFps = useMemo(() => {
    if (typeof fps === "number" && Number.isFinite(fps) && fps > 0) {
      return fps;
    }

    if (videoDuration > 0 && maxFrameIndex > 0) {
      return maxFrameIndex / videoDuration;
    }

    return 30;
  }, [fps, maxFrameIndex, videoDuration]);

  const activeMasks = useMemo(() => {
    return frameMasks[currentFrame] ?? [];
  }, [currentFrame, frameMasks]);

  const { rasterMasks, imageMasks, boxMasks } = useMemo(() => {
    const raster = [];
    const image = [];
    const boxes = [];

    for (const mask of activeMasks) {
      if (mask.rle) {
        raster.push(mask);
        continue;
      }

      image.push(mask);
      if (Array.isArray(mask.box) && mask.box.length >= 4) {
        boxes.push(mask);
      }
    }

    return {
      rasterMasks: raster,
      imageMasks: image,
      boxMasks: boxes,
    };
  }, [activeMasks]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const displayWidth = Math.max(1, video.clientWidth);
    const displayHeight = Math.max(1, video.clientHeight);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (rasterMasks.length === 0) {
      return;
    }

    const imageData = context.createImageData(canvas.width, canvas.height);
    const pixels = imageData.data;
    const palette: Array<[number, number, number]> = [
      [56, 189, 248],
      [34, 197, 94],
      [244, 114, 182],
      [250, 204, 21],
      [251, 146, 60],
    ];

    for (let maskIndex = 0; maskIndex < rasterMasks.length; maskIndex += 1) {
      const mask = rasterMasks[maskIndex]!;
      const rle = mask.rle;
      if (!rle) {
        continue;
      }

      const decoded = decodeCocoRleMask(rle);
      const [red, green, blue] = palette[maskIndex % palette.length]!;

      for (let y = 0; y < canvas.height; y += 1) {
        const sourceY = Math.min(decoded.height - 1, Math.floor((y * decoded.height) / canvas.height));
        const sourceRowOffset = sourceY * decoded.width;
        const targetRowOffset = y * canvas.width;

        for (let x = 0; x < canvas.width; x += 1) {
          const sourceX = Math.min(decoded.width - 1, Math.floor((x * decoded.width) / canvas.width));
          const sourceIndex = sourceRowOffset + sourceX;
          if (decoded.data[sourceIndex] === 0) {
            continue;
          }

          const pixelOffset = (targetRowOffset + x) * 4;
          pixels[pixelOffset] = red;
          pixels[pixelOffset + 1] = green;
          pixels[pixelOffset + 2] = blue;
          pixels[pixelOffset + 3] = 110;
        }
      }
    }

    context.putImageData(imageData, 0, 0);
  }, [rasterMasks]);

  const updateCurrentFrame = (timeSeconds: number) => {
    const nextFrame = Math.max(0, Math.floor(timeSeconds * resolvedFps));
    setCurrentFrame(nextFrame);
    onFrameChange?.(nextFrame);
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
        <video
          ref={videoRef}
          src={src}
          controls
          className="h-auto w-full"
          onLoadedMetadata={(event) => {
            const duration = Number(event.currentTarget.duration);
            if (Number.isFinite(duration) && duration > 0) {
              setVideoDuration(duration);
            }
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
                key={`${mask.key}-${index}`}
                src={mask.url}
                alt={`Frame ${currentFrame} mask ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
              />
            ))}
          </div>
        ) : null}

        {boxMasks.length > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            {boxMasks.map((mask, index) => {
              const box = mask.box;
              if (!box) {
                return null;
              }

              const [x1, y1, x2, y2] = box;
              const left = toPercent(x1);
              const top = toPercent(y1);
              const width = toPercent(x2 - x1);
              const height = toPercent(y2 - y1);

              return (
                <div
                  key={`${mask.key}-box-${index}`}
                  className="absolute border-2 border-sky-400/80 bg-sky-400/10"
                  style={{ left, top, width, height }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Frame {currentFrame} · {activeMasks.length} masks
      </p>
    </div>
  );
}
