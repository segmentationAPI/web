"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "typing" | "submitted" | "processing" | "done";

interface SegVideoDemoProps {
    query?: string;
    videoSrc?: string;
    labelCountText?: string;
    labelDetailedText?: string;
    filename?: string;
    className?: string;
}

export function SegVideoDemo({
    query = "Spiderman",
    videoSrc = "/spiderman.mp4",
    labelCountText = "✓ 1 track",
    labelDetailedText = "1 object tracked · 96.4% confidence",
    filename = "spiderman.mp4",
    className = "",
}: SegVideoDemoProps = {}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    }, []);

    const typed = query;
    const isDone = true;
    const isProcessing = false;
    const isSubmitted = true;

    return (
        <div
            className={`relative flex flex-col select-none overflow-hidden rounded-[1.6rem] bg-[#0e0c18] ${className}`}
            style={{ transform: "translateZ(0)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
            {/* ── window chrome ─────────────────────────────────── */}
            <div
                className="relative z-10 flex shrink-0 items-center gap-4 px-3 py-1.5"
                style={{
                    background: "rgba(30, 28, 40, 0.92)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                {/* Search bar */}
                <div
                    className="relative flex flex-1 items-center gap-2 overflow-hidden rounded-md px-2.5 py-1 transition-all duration-300"
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
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0 opacity-50"
                    >
                        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>

                    {/* typed text + cursor */}
                    <span className="font-mono text-[13px] text-white/90">
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
                        ? labelCountText
                        : isProcessing
                            ? "Tracking…"
                            : isSubmitted
                                ? "Queuing…"
                                : ""}
                </span>
            </div>

            {/* ── Video viewport ─────────────────────────────────────── */}
            <div className="relative flex-1 w-full overflow-hidden bg-[#0e0c18] border-y border-white/5">

                {/* BEFORE mask: A dark empty slate while idle/processing */}
                <div
                    className="absolute inset-0 bg-[#0e0c18] transition-opacity duration-700 z-10"
                    style={{ opacity: isDone ? 0 : 1 }}
                />

                {/* AFTER video - plays constantly but only revealed when isDone */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover object-[center] transition-opacity duration-700 pointer-events-none"
                    style={{ opacity: isDone ? 1 : 0 }}
                />

                {/* Processing overlay */}
                {isProcessing && !isDone && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
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
                                Running SAM 3 Tracking…
                            </span>
                        </div>
                    </div>
                )}

                {/* Mask-reveal flash on done */}
                {isDone && (
                    <div
                        className="pointer-events-none absolute inset-0 z-20"
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
                className="flex shrink-0 items-center justify-between px-4 py-1.5 font-mono text-[10px]"
                style={{
                    background: "rgba(18,16,30,0.95)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <span style={{ color: "rgba(255,255,255,0.3)" }}>
                    {filename}
                </span>
                <span
                    style={{
                        color: isDone ? "#39d5c9" : "rgba(255,255,255,0.2)",
                        transition: "color 0.4s ease",
                    }}
                >
                    {isDone ? labelDetailedText : "No tracking yet"}
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
