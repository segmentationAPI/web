"use client";

import { useEffect, useRef, useState } from "react";

// Phase timeline (ms from mount):
//   0      → idle, cursor blinking in empty bar
//   800    → start typing "cells" (char by char, 120ms each)
//   1400   → fully typed, brief pause
//   1800   → submit: bar shimmers, image fades out
//   2300   → processing ring + labels appear briefly
//   2900   → segmented image fades in, masks reveal
//   3600   → settled / restart loop after 5s

type Phase = "idle" | "typing" | "submitted" | "processing" | "done";

const QUERY = "cells";
const CHAR_MS = 110;
const TYPE_START = 800;
const SUBMIT_AT = TYPE_START + QUERY.length * CHAR_MS + 350;
const PROCESS_AT = SUBMIT_AT + 320;
const DONE_AT = PROCESS_AT + 680;
const RESTART_AT = DONE_AT + 5200;
const TOTAL = RESTART_AT;

export function SegQueryDemo() {
    const [typed, setTyped] = useState("");
    const [phase, setPhase] = useState<Phase>("idle");
    const startTime = useRef<number>(0);
    const raf = useRef<number>(0);

    useEffect(() => {
        startTime.current = performance.now();

        function tick(now: number) {
            const t = now - startTime.current;

            if (t >= RESTART_AT) {
                // Reset
                startTime.current = now;
                setTyped("");
                setPhase("idle");
                raf.current = requestAnimationFrame(tick);
                return;
            }

            if (t >= DONE_AT) {
                setPhase("done");
            } else if (t >= PROCESS_AT) {
                setPhase("processing");
            } else if (t >= SUBMIT_AT) {
                setPhase("submitted");
            } else if (t >= TYPE_START) {
                const charsToShow = Math.min(
                    QUERY.length,
                    Math.floor((t - TYPE_START) / CHAR_MS) + 1,
                );
                setTyped(QUERY.slice(0, charsToShow));
                setPhase("typing");
            } else {
                setPhase("idle");
                setTyped("");
            }

            raf.current = requestAnimationFrame(tick);
        }

        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, []);

    const isDone = phase === "done";
    const isProcessing = phase === "processing";
    const isSubmitted = phase === "submitted" || isProcessing || isDone;

    return (
        <div className="relative select-none overflow-hidden rounded-[1.6rem]">
            {/* ── macOS window chrome ─────────────────────────────────── */}
            <div
                className="relative z-10 flex items-center gap-2 px-3 py-2"
                style={{
                    background: "rgba(30, 28, 40, 0.92)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                {/* Traffic lights */}
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />

                {/* Search bar */}
                <div
                    className="relative ml-3 flex flex-1 items-center gap-2 overflow-hidden rounded-lg px-3.5 py-2 transition-all duration-300"
                    style={{
                        background: isSubmitted
                            ? "rgba(124,92,252,0.12)"
                            : "rgba(255,255,255,0.06)",
                        border: isSubmitted
                            ? "1px solid rgba(124,92,252,0.5)"
                            : "1px solid rgba(255,255,255,0.10)",
                        boxShadow: isSubmitted
                            ? "0 0 18px rgba(124,92,252,0.25)"
                            : "none",
                    }}
                >
                    {/* magnifier icon */}
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0 opacity-50"
                    >
                        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>

                    {/* typed text + cursor */}
                    <span className="font-mono text-[15px] text-white/90">
                        {typed}
                        {!isSubmitted && (
                            <span
                                className="inline-block h-[13px] w-[1.5px] translate-y-[1px] bg-[#a78bfa]"
                                style={{ animation: "blink 1s step-end infinite" }}
                            />
                        )}
                    </span>

                    {/* shimmer on submit */}
                    {isSubmitted && (
                        <span
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    "linear-gradient(90deg, transparent 0%, rgba(124,92,252,0.18) 50%, transparent 100%)",
                                animation: "shimmer 1.6s linear infinite",
                            }}
                        />
                    )}

                    {/* "Enter ↵" hint while typing */}
                    {!isSubmitted && typed.length > 0 && (
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-white/30">
                            ↵
                        </span>
                    )}
                </div>

                {/* Status label */}
                <span
                    className="ml-2 shrink-0 font-mono text-[10px] transition-all duration-300"
                    style={{ color: isDone ? "#39d5c9" : isProcessing ? "#a78bfa" : "rgba(255,255,255,0.3)" }}
                >
                    {isDone
                        ? "✓ 14 masks"
                        : isProcessing
                            ? "Labeling…"
                            : isSubmitted
                                ? "Queuing…"
                                : ""}
                </span>
            </div>

            {/* ── Image viewport ─────────────────────────────────────── */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0e0c18]">
                {/* BEFORE image */}
                <img
                    src="/cells-before.jpg"
                    alt="Microscopy cells — before segmentation"
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                    style={{ opacity: isDone ? 0 : 1 }}
                />

                {/* AFTER image */}
                <img
                    src="/cells-after.jpg"
                    alt="Microscopy cells — after SAM 3 auto-segmentation"
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                    style={{ opacity: isDone ? 1 : 0 }}
                />

                {/* Processing overlay */}
                {isProcessing && !isDone && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="flex flex-col items-center gap-3"
                            style={{ animation: "fadeIn 0.25s ease" }}
                        >
                            {/* Spinning ring */}
                            <svg width="48" height="48" viewBox="0 0 48 48">
                                <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(124,92,252,0.2)" strokeWidth="4" />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="18"
                                    fill="none"
                                    stroke="url(#proc-grad)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray="30 83"
                                    style={{ animation: "spin 0.8s linear infinite", transformOrigin: "24px 24px" }}
                                />
                                <defs>
                                    <linearGradient id="proc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#7c5cfc" />
                                        <stop offset="100%" stopColor="#39d5c9" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="font-mono text-[11px] text-white/60">
                                Running SAM 3…
                            </span>
                        </div>
                    </div>
                )}

                {/* Mask-reveal flash on done */}
                {isDone && (
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(ellipse at 50% 50%, rgba(57,213,201,0.12), transparent 70%)",
                            animation: "fadeIn 0.4s ease",
                        }}
                    />
                )}
            </div>

            {/* ── Footer bar ─────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-4 py-1.5 font-mono text-[10px]"
                style={{
                    background: "rgba(18,16,30,0.95)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <span style={{ color: "rgba(255,255,255,0.3)" }}>
                    cells-sample-001.jpg
                </span>
                <span
                    style={{
                        color: isDone ? "#39d5c9" : "rgba(255,255,255,0.2)",
                        transition: "color 0.4s ease",
                    }}
                >
                    {isDone ? "14 objects · 100% confidence" : "No labels yet"}
                </span>
            </div>

            {/* Global keyframes (injected once) */}
            <style>{`
        @keyframes blink   { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes shimmer { 0% { transform:translateX(-100%) } 100% { transform:translateX(200%) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
      `}</style>
        </div>
    );
}
