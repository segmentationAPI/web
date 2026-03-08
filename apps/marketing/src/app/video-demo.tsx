"use client";

import { useEffect, useRef, useState } from "react";

export function VideoDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="reveal border-border/70 space-y-3 rounded-[1.6rem] border bg-[#090b10]/60 p-3 sm:p-4"
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px] tracking-[0.2em] uppercase">
        <span>Video Demo</span>
        <span className="text-foreground inline-flex items-center gap-2">
          <span className="bg-secondary h-2 w-2 rounded-full shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
          live
        </span>
      </div>

      <div className="border-border/70 relative overflow-hidden rounded-[1.4rem] border bg-[#090b10]">
        <video
          ref={videoRef}
          src="/spider-man.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          className="aspect-video w-full object-cover"
        />
      </div>

      <div className="border-border/70 bg-background/85 rounded-lg border p-3">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground/70 text-[11px] tracking-wider uppercase">
            prompt:
          </span>
          <span className="text-foreground font-mono text-[11px]">spider-man</span>
        </div>
      </div>
    </div>
  );
}
