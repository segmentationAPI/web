"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeCocoRleMask, type VideoFrameMaskMap } from "@segmentationapi/sdk";

const UNSUPPORTED_COMPOSITE_MESSAGE = "Masked preview encoding is not supported in this browser.";
const MASK_PALETTE: Array<[number, number, number]> = [
  [56, 189, 248],
  [34, 197, 94],
  [244, 114, 182],
  [250, 204, 21],
  [251, 146, 60],
];

type VideoCanvasProps = {
  src: string;
  frameMasks: VideoFrameMaskMap;
  fps?: number;
  onFrameChange?: (frame: number) => void;
};

export function VideoCanvas({
  src,
  frameMasks,
  fps,
  onFrameChange,
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [compositedSrc, setCompositedSrc] = useState<string | null>(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

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

  const activeMasks = useMemo(() => frameMasks[currentFrame] ?? [], [currentFrame, frameMasks]);
  const hasFrameMasks = frameKeys.length > 0;

  const resetCompositedSrc = () => {
    setCompositedSrc((previousSrc) => {
      if (previousSrc) {
        URL.revokeObjectURL(previousSrc);
      }
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (compositedSrc) {
        URL.revokeObjectURL(compositedSrc);
      }
    };
  }, [compositedSrc]);

  useEffect(() => {
    let cancelled = false;

    const renderCompositeVideo = async () => {
      if (!hasFrameMasks) {
        setComposeError(null);
        setIsCompositing(false);
        resetCompositedSrc();
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        setComposeError(UNSUPPORTED_COMPOSITE_MESSAGE);
        return;
      }

      const probeCanvas = document.createElement("canvas");
      if (typeof probeCanvas.captureStream !== "function") {
        setComposeError(UNSUPPORTED_COMPOSITE_MESSAGE);
        return;
      }

      setComposeError(null);
      setIsCompositing(true);

      const sourceVideo = document.createElement("video");
      sourceVideo.src = src;
      sourceVideo.muted = true;
      sourceVideo.playsInline = true;
      sourceVideo.preload = "auto";

      const loadMetadata = new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Failed to load source video metadata."));
        };
        const cleanup = () => {
          sourceVideo.removeEventListener("loadedmetadata", onLoadedMetadata);
          sourceVideo.removeEventListener("error", onError);
        };

        sourceVideo.addEventListener("loadedmetadata", onLoadedMetadata);
        sourceVideo.addEventListener("error", onError);
      });

      try {
        await loadMetadata;

        const renderWidth = Math.max(1, sourceVideo.videoWidth || sourceVideo.clientWidth || 1);
        const renderHeight = Math.max(1, sourceVideo.videoHeight || sourceVideo.clientHeight || 1);
        const renderCanvas = document.createElement("canvas");
        renderCanvas.width = renderWidth;
        renderCanvas.height = renderHeight;

        const context = renderCanvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to create 2D drawing context.");
        }

        const stream = renderCanvas.captureStream(Math.max(1, Math.floor(resolvedFps)));
        const mimeTypeCandidates = [
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
        ];
        const mimeType = mimeTypeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
        if (!mimeType) {
          throw new Error("No supported video codec found for masked preview.");
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });
        const streamTracks = stream.getTracks();
        const chunks: BlobPart[] = [];

        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        });

        const imageCache = new Map<string, HTMLImageElement>();
        const decodedRleCache = new Map<string, ReturnType<typeof decodeCocoRleMask>>();

        const getImage = (url: string) => {
          const cached = imageCache.get(url);
          if (cached) {
            return cached;
          }

          const next = new Image();
          next.crossOrigin = "anonymous";
          next.src = url;
          imageCache.set(url, next);
          return next;
        };

        const drawCurrentFrame = () => {
          if (cancelled) {
            return;
          }

          context.clearRect(0, 0, renderWidth, renderHeight);
          context.drawImage(sourceVideo, 0, 0, renderWidth, renderHeight);

          const frameIndex = Math.max(0, Math.floor(sourceVideo.currentTime * resolvedFps));
          const masks = frameMasks[frameIndex] ?? [];

          if (masks.length === 0) {
            return;
          }

          const rasterMasks = masks.filter((mask) => mask.rle);
          if (rasterMasks.length > 0) {
            const imageData = context.getImageData(0, 0, renderWidth, renderHeight);
            const pixels = imageData.data;

            for (let maskIndex = 0; maskIndex < rasterMasks.length; maskIndex += 1) {
              const mask = rasterMasks[maskIndex]!;
              const rle = mask.rle;
              if (!rle) {
                continue;
              }

              const cacheKey = `${rle.size[0]}x${rle.size[1]}:${typeof rle.counts === "string" ? rle.counts : rle.counts.join(",")}`;
              const decoded = decodedRleCache.get(cacheKey) ?? decodeCocoRleMask(rle);
              if (!decodedRleCache.has(cacheKey)) {
                decodedRleCache.set(cacheKey, decoded);
              }

              const [red, green, blue] = MASK_PALETTE[maskIndex % MASK_PALETTE.length]!;

              for (let y = 0; y < renderHeight; y += 1) {
                const sourceY = Math.min(
                  decoded.height - 1,
                  Math.floor((y * decoded.height) / renderHeight),
                );
                const sourceRowOffset = sourceY * decoded.width;
                const targetRowOffset = y * renderWidth;

                for (let x = 0; x < renderWidth; x += 1) {
                  const sourceX = Math.min(
                    decoded.width - 1,
                    Math.floor((x * decoded.width) / renderWidth),
                  );
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
          }

          context.save();
          context.globalAlpha = 0.65;
          for (const mask of masks) {
            if (!mask.url) {
              continue;
            }

            const image = getImage(mask.url);
            if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
              context.drawImage(image, 0, 0, renderWidth, renderHeight);
            }
          }
          context.restore();

          context.lineWidth = Math.max(1, Math.floor(renderWidth * 0.003));
          context.strokeStyle = "rgba(56, 189, 248, 0.85)";
          context.fillStyle = "rgba(56, 189, 248, 0.18)";

          for (const mask of masks) {
            const box = mask.box;
            if (!box || box.length < 4) {
              continue;
            }

            const [x1, y1, x2, y2] = box;
            const left = Math.max(0, Math.min(renderWidth, x1 * renderWidth));
            const top = Math.max(0, Math.min(renderHeight, y1 * renderHeight));
            const width = Math.max(0, (x2 - x1) * renderWidth);
            const height = Math.max(0, (y2 - y1) * renderHeight);

            context.fillRect(left, top, width, height);
            context.strokeRect(left, top, width, height);
          }
        };

        const waitForStop = new Promise<void>((resolve, reject) => {
          const onStop = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("Failed to encode masked preview."));
          };
          const cleanup = () => {
            recorder.removeEventListener("stop", onStop);
            recorder.removeEventListener("error", onError);
          };

          recorder.addEventListener("stop", onStop);
          recorder.addEventListener("error", onError);
        });

        let rafHandle = 0;
        const onVideoFrame = () => {
          drawCurrentFrame();
          if (!sourceVideo.ended) {
            sourceVideo.requestVideoFrameCallback(onVideoFrame);
          }
        };

        const renderWithRaf = () => {
          drawCurrentFrame();
          if (!sourceVideo.ended) {
            rafHandle = window.requestAnimationFrame(renderWithRaf);
          }
        };

        sourceVideo.addEventListener("ended", () => {
          if (rafHandle !== 0) {
            window.cancelAnimationFrame(rafHandle);
            rafHandle = 0;
          }
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, { once: true });

        recorder.start();
        await sourceVideo.play();

        if ("requestVideoFrameCallback" in sourceVideo) {
          sourceVideo.requestVideoFrameCallback(onVideoFrame);
        } else {
          rafHandle = window.requestAnimationFrame(renderWithRaf);
        }

        await waitForStop;
        streamTracks.forEach((track) => track.stop());

        if (cancelled || chunks.length === 0) {
          return;
        }

        const resultBlob = new Blob(chunks, { type: mimeType });
        const nextUrl = URL.createObjectURL(resultBlob);

        setCompositedSrc((previousSrc) => {
          if (previousSrc) {
            URL.revokeObjectURL(previousSrc);
          }
          return nextUrl;
        });
      } catch (error) {
        if (!cancelled) {
          setComposeError(
            error instanceof Error ? error.message : "Failed to render masked preview.",
          );
          resetCompositedSrc();
        }
      } finally {
        sourceVideo.pause();
        sourceVideo.removeAttribute("src");
        sourceVideo.load();
        if (!cancelled) {
          setIsCompositing(false);
        }
      }
    };

    void renderCompositeVideo();

    return () => {
      cancelled = true;
    };
  }, [frameMasks, hasFrameMasks, resolvedFps, src]);

  const playbackSrc = compositedSrc ?? src;

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
          src={playbackSrc}
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
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Frame {currentFrame} · {activeMasks.length} masks
      </p>
      {hasFrameMasks ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {isCompositing
            ? "Compositing masked video preview..."
            : composeError
              ? composeError
              : compositedSrc
                ? "Playing composited masked preview"
                : "Mask compositing unavailable; playing source video"}
        </p>
      ) : null}
    </div>
  );
}
