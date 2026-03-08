"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const PROMPT_TEXT = "clocks";
const CHAR_DELAY = 120;
const PAUSE_AFTER_TYPING = 600;
const PROCESSING_DURATION = 1800;
const DONE_HOLD = 3000;
const RESTART_DELAY = 800;

type Phase = "idle" | "typing" | "processing" | "done";

function reset(
  setPhase: (p: Phase) => void,
  setDisplayedText: (t: string) => void,
  charIndex: React.RefObject<number>,
) {
  setDisplayedText("");
  charIndex.current = 0;
  setTimeout(() => setPhase("typing"), RESTART_DELAY);
}

export function LiveDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayedText, setDisplayedText] = useState("");
  const charIndex = useRef(0);
  const started = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          observer.disconnect();
          setTimeout(() => setPhase("typing"), 800);
        }
      },
      { threshold: 0.4 },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "typing") return;

    const interval = setInterval(() => {
      charIndex.current += 1;
      setDisplayedText(PROMPT_TEXT.slice(0, charIndex.current));

      if (charIndex.current >= PROMPT_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("processing"), PAUSE_AFTER_TYPING);
      }
    }, CHAR_DELAY);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "processing") return;
    const timeout = setTimeout(() => setPhase("done"), PROCESSING_DURATION);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = setTimeout(() => reset(setPhase, setDisplayedText, charIndex), DONE_HOLD);
    return () => clearTimeout(timeout);
  }, [phase]);

  const showAfter = phase === "done";
  const isProcessing = phase === "processing";

  return (
    <div
      ref={containerRef}
      className="reveal border-border/70 space-y-3 rounded-[1.6rem] border bg-[#090b10]/60 p-3 sm:p-4"
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px] tracking-[0.2em] uppercase">
        <span>Live Demo</span>
        {isProcessing && (
          <span className="text-foreground inline-flex items-center gap-2">
            <span className="border-secondary/30 border-t-secondary inline-block h-2.5 w-2.5 animate-spin rounded-full border-[1.5px]" />
            segmenting&hellip;
          </span>
        )}
        {showAfter && (
          <span className="text-foreground inline-flex items-center gap-2">
            <span className="bg-secondary h-2 w-2 rounded-full shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
            complete
          </span>
        )}
      </div>

      <div className="border-border/70 relative h-64 overflow-hidden rounded-[1.4rem] border bg-[#090b10] sm:h-77.5">
        <Image
          src="/before.jpg"
          alt="Original image"
          fill
          className={`object-cover transition-opacity duration-500 ${showAfter ? "opacity-0" : "opacity-100"}`}
          priority
        />
        <Image
          src="/after.jpg"
          alt="Segmented image"
          fill
          className={`object-cover transition-opacity duration-500 ${showAfter ? "opacity-100" : "opacity-0"}`}
          priority
        />

        {isProcessing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="border-secondary/60 h-14 w-14 animate-ping rounded-full border-2" />
          </div>
        )}
      </div>

      <div className="border-border/70 bg-background/85 rounded-lg border p-3">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground/70 text-[11px] tracking-wider uppercase">
            prompt:
          </span>
          <span className="text-foreground font-mono text-[11px]">
            {displayedText}
            {(phase === "typing" || phase === "idle") && (
              <span className="bg-primary ml-px inline-block h-[1em] w-[1.5px] animate-[blink_720ms_step-end_infinite] align-text-bottom" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
