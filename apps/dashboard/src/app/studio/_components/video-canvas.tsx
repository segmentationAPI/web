"use client";

import { useMemo, useState } from "react";
import type { VideoFrameMaskMap } from "@segmentationapi/sdk";

type VideoCanvasProps = {
  src: string;
  frameMasks: VideoFrameMaskMap;
  fps?: number;
  onFrameChange?: (frame: number) => void;
};

export function VideoCanvas({
  src,
  frameMasks,
  fps = 30,
  onFrameChange,
}: VideoCanvasProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  const activeMasks = useMemo(() => {
    return frameMasks[currentFrame] ?? [];
  }, [currentFrame, frameMasks]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
        <video
          src={src}
          controls
          className="h-auto w-full"
          onTimeUpdate={(event) => {
            const nextFrame = Math.max(0, Math.floor(event.currentTarget.currentTime * fps));
            setCurrentFrame(nextFrame);
            onFrameChange?.(nextFrame);
          }}
          onSeeked={(event) => {
            const nextFrame = Math.max(0, Math.floor(event.currentTarget.currentTime * fps));
            setCurrentFrame(nextFrame);
            onFrameChange?.(nextFrame);
          }}
        />

        {activeMasks.length > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            {activeMasks.map((mask, index) => (
              <img
                key={`${mask.key}-${index}`}
                src={mask.url}
                alt={`Frame ${currentFrame} mask ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-65"
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Frame {currentFrame} · {activeMasks.length} masks
      </p>
    </div>
  );
}
