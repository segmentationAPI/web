import type { Metadata } from "next";
import Link from "next/link";

import { SegQueryDemo } from "@/components/seg-query-demo";

import { env } from "@segmentation/env/marketing";
import {
    ArrowRight,
    BarChart2,
    FileJson,
    Layers,
    Sparkles,
    Wand2,
    Zap,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Auto Label Studio — SegmentationAPI",
    description:
        "Upload your image dataset and let SAM 3 auto-label every frame in seconds. Zero-shot segmentation masks, confidence scores, and 30+ export formats — no training data required.",
    openGraph: {
        title: "Auto Label Studio — SegmentationAPI",
        description:
            "Automatically label entire image datasets with SAM 3. 10K images/min, 99.1% accuracy, COCO / YOLO / VOC export.",
    },
};

// ─── Data ──────────────────────────────────────────────────────────────────

const steps = [
    {
        num: "01",
        title: "Upload Images",
        detail:
            "Create a project and upload your images directly from your device. Any image format supported.",
        color: "#a78bfa",
    },
    {
        num: "02",
        title: "AI Auto-Labels",
        detail:
            "Type a text prompt describing what to find. Our AI automatically segments every matching object across all your images and generates precise pixel masks.",
        color: "#39d5c9",
    },
    {
        num: "03",
        title: "Export Labels",
        detail:
            "Download your masks as PNG, COCO JSON, YOLO bounding boxes, or Label Studio JSON — all packaged in a single ZIP.",
        color: "#ff703f",
    },
] as const;

const features = [
    {
        icon: Wand2,
        title: "Zero-shot Labeling",
        body: "No training data needed. SAM 3's foundational model generalizes across any domain — medical, satellite, retail, or custom.",
        accentClass: "text-[#a78bfa]",
        borderHover: "hover:border-[#7c5cfc]/60",
    },
    {
        icon: Layers,
        title: "Batch Processing",
        body: "Queue entire datasets. Parallel GPU batches horizontally scale to millions of images without you lifting a finger.",
        accentClass: "text-[#39d5c9]",
        borderHover: "hover:border-[#39d5c9]/60",
    },
    {
        icon: BarChart2,
        title: "Confidence Scoring",
        body: "Every label ships with a confidence score. Filter out low-certainty annotations automatically before export.",
        accentClass: "text-[#ff703f]",
        borderHover: "hover:border-[#ff703f]/60",
    },
    {
        icon: FileJson,
        title: "Format Compatibility",
        body: "Export to PNG Masks, COCO JSON, YOLO bounding boxes, or Label Studio JSON — all in one ZIP download.",
        accentClass: "text-[#f2b77a]",
        borderHover: "hover:border-[#f2b77a]/60",
    },
] as const;

const stats = [
    { value: "10K+", label: "images / minute" },
    { value: "99.1%", label: "avg accuracy" },
    { value: "<2s", label: "per image" },
    { value: "30+", label: "export formats" },
] as const;

const useCases = [
    {
        emoji: "🚗",
        title: "Autonomous Driving",
        body: "Label road scenes, pedestrians, and obstacles at fleet scale. Works with dashcam video frames, LiDAR projections, and fisheye inputs.",
        tags: ["Road scenes", "Obstacles", "Lane detection"],
    },
    {
        emoji: "🏥",
        title: "Medical Imaging",
        body: "Delineate tissue boundaries, tumors, and anomalies in MRI, CT, and pathology slides with sub-pixel mask precision.",
        tags: ["MRI / CT", "Pathology", "Anomaly detection"],
    },
    {
        emoji: "🛒",
        title: "Retail & E-commerce",
        body: "Automate product cutouts, shelf-level inventory counting, and visual search indexing across millions of SKUs.",
        tags: ["Product cutout", "Inventory", "Visual search"],
    },
] as const;

// ─── Neural Sweep Demo Panel ───────────────────────────────────────────────

const cellColors = [
    { bg: "rgba(124,92,252,0.22)", border: "rgba(124,92,252,0.55)" },
    { bg: "rgba(57,213,201,0.18)", border: "rgba(57,213,201,0.5)" },
    { bg: "rgba(255,112,63,0.18)", border: "rgba(255,112,63,0.45)" },
    { bg: "rgba(57,213,201,0.2)", border: "rgba(57,213,201,0.5)" },
    { bg: "rgba(124,92,252,0.2)", border: "rgba(124,92,252,0.55)" },
    { bg: "rgba(255,112,63,0.16)", border: "rgba(255,112,63,0.45)" },
] as const;

// Smaller, more diverse shapes — each occupies only a portion of the cell
// mimicking real segmentation masks on varied object shapes
const cellShapes = [
    // elongated triangle (top-left object)
    "polygon(10% 8%, 68% 5%, 52% 70%, 8% 65%)",
    // narrow diagonal strip
    "polygon(5% 30%, 60% 5%, 72% 42%, 18% 68%)",
    // tall thin trapezoid (right column)
    "polygon(55% 10%, 85% 14%, 80% 75%, 48% 70%)",
    // small irregular blob (center-left)
    "polygon(15% 20%, 55% 12%, 62% 58%, 40% 65%, 10% 50%)",
    // L-shaped accent (bottom-center)
    "polygon(8% 40%, 55% 38%, 56% 60%, 30% 62%, 28% 88%, 8% 88%)",
    // small rotated rectangle
    "polygon(30% 18%, 78% 10%, 82% 50%, 34% 58%)",
] as const;

function NeuralSweepPanel() {
    return (
        <article className="al-glass-panel reveal relative overflow-hidden rounded-[2rem] p-5 sm:p-7">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -left-12 -top-16 h-52 w-52 rounded-full bg-[#7c5cfc]/25 blur-[72px]" />
            <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-[#39d5c9]/20 blur-[80px]" />

            {/* Pulsing node dots — decorative neural mesh */}
            <div className="al-node" style={{ top: "12%", left: "8%", animationDelay: "0s" }} />
            <div className="al-node" style={{ top: "28%", left: "22%", animationDelay: "0.6s" }} />
            <div className="al-node" style={{ top: "8%", right: "14%", animationDelay: "1.1s" }} />
            <div className="al-node" style={{ bottom: "22%", right: "9%", animationDelay: "1.8s" }} />
            <div className="al-node" style={{ bottom: "10%", left: "34%", animationDelay: "0.9s" }} />

            <div className="relative z-10 space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="al-tone-chip">
                        <Sparkles className="h-3 w-3" />
                        Auto Labeling
                    </span>
                    <span className="inline-flex items-center gap-2 font-mono text-foreground">
                        <span className="h-2 w-2 rounded-full bg-[#7c5cfc] shadow-[0_0_14px_rgba(124,92,252,0.9)]" />
                        Processing…
                    </span>
                </div>

                {/* Dataset grid with sweep animation */}
                <div className="al-sweep-panel rounded-[1.4rem] border border-[#7c5cfc]/20 bg-[#07060f] p-3 sm:p-4">
                    <div className="al-sweep-line" />
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {cellColors.map((cell, i) => (
                            <div key={i} className="al-img-cell aspect-square">
                                {/* Raw image placeholder — dark textured bg */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: `radial-gradient(circle at ${30 + i * 10}% ${20 + i * 12}%, rgba(255,255,255,0.03), transparent 60%), rgba(14,12,24,0.95)`,
                                    }}
                                />
                                {/* Subtle noise-like lines to suggest image detail */}
                                <div
                                    className="absolute inset-0 opacity-15"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                                        backgroundSize: "8px 8px",
                                    }}
                                />
                                {/* Segmentation mask — smaller, diverse shapes */}
                                <div
                                    className="al-img-cell-mask"
                                    style={{
                                        background: cell.bg,
                                        border: `1.5px solid ${cell.border}`,
                                        clipPath: cellShapes[i],
                                        inset: "4px",
                                    }}
                                />
                                {/* Confidence badge */}
                                <div className="absolute bottom-1.5 right-1.5">
                                    <span
                                        className="rounded-md px-1.5 py-0.5 font-mono text-[8px] font-semibold leading-tight"
                                        style={{
                                            background: "rgba(7,6,15,0.85)",
                                            color: "#c4b5fd",
                                            border: `1px solid ${cell.border}`,
                                        }}
                                    >
                                        {(0.96 + i * 0.006).toFixed(3)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress bar + ring */}
                <div className="flex items-center gap-4">
                    <div className="al-ring-wrap h-14 w-14 shrink-0">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                            {/* Track */}
                            <circle
                                cx="28"
                                cy="28"
                                r="20"
                                fill="none"
                                stroke="rgba(124,92,252,0.15)"
                                strokeWidth="4"
                            />
                            {/* Fill */}
                            <circle
                                className="al-ring-circle al-ring"
                                cx="28"
                                cy="28"
                                r="20"
                                fill="none"
                                stroke="url(#al-ring-grad)"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="al-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#7c5cfc" />
                                    <stop offset="100%" stopColor="#39d5c9" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="absolute font-display text-[11px] font-bold text-[#c4b5fd]">90%</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                            <span>Labels generated</span>
                            <span className="text-[#c4b5fd]">9,012 / 10,000</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#7c5cfc]/15">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: "90%",
                                    background: "linear-gradient(90deg, #7c5cfc, #39d5c9)",
                                    boxShadow: "0 0 12px rgba(124,92,252,0.6)",
                                }}
                            />
                        </div>
                        <p className="font-mono text-[9px] text-muted-foreground">
                            ETA: ~18 seconds remaining
                        </p>
                    </div>
                </div>
            </div>
        </article>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AutoLabelPage() {
    return (
        <main className="mx-auto flex w-full max-w-300 flex-col gap-12 px-4 pb-20 pt-5 sm:gap-16 sm:px-8 lg:gap-24">

            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section id="top" className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="space-y-6 reveal" style={{ animationDelay: "100ms" }}>
                    <div className="space-y-4">
                        <p className="al-tone-chip">
                            <Sparkles className="h-3 w-3" />
                            Auto Label Studio
                        </p>
                        <h1 className="font-display text-[2.1rem] leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.6rem]">
                            Label thousands of images{" "}
                            <span className="al-gradient-text">in seconds.</span>
                        </h1>
                        <p className="max-w-xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                            Upload your entire image dataset and let SAM 3 auto-annotate every frame — zero-shot,
                            no training required. Get precise segmentation masks, class labels, and confidence
                            scores ready to drop into your ML pipeline.
                        </p>
                    </div>

                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <a
                            href={`${env.NEXT_PUBLIC_APP_URL}/auto-label`}
                            className="cta-primary w-full sm:w-auto"
                            style={{
                                background: "linear-gradient(120deg, #7c5cfc, #a78bfa)",
                                borderColor: "rgba(124,92,252,0.65)",
                                boxShadow: "0 10px 30px rgba(124,92,252,0.4)",
                                color: "#f5f0ff",
                            }}
                        >
                            Try Auto Label
                            <ArrowRight className="h-4 w-4" />
                        </a>
                        <a href="#how-it-works" className="cta-ghost w-full sm:w-auto">
                            See how it works
                        </a>
                    </div>

                    {/* Quick stat pills */}
                    <div className="flex flex-wrap gap-3">
                        {[
                            { v: "10K+", l: "images / min" },
                            { v: "99.1%", l: "accuracy" },
                            { v: "30+", l: "formats" },
                        ].map((s) => (
                            <div
                                key={s.l}
                                className="metric-card flex items-baseline gap-2"
                                style={{
                                    borderColor: "rgba(124,92,252,0.4)",
                                }}
                            >
                                <span
                                    className="font-display text-xl leading-none"
                                    style={{
                                        background: "linear-gradient(108deg,#c4b5fd,#39d5c9)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    {s.v}
                                </span>
                                <span className="metric-label mt-0 text-[10px]">{s.l}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Neural Sweep panel */}
                <div className="reveal" style={{ animationDelay: "200ms" }}>
                    <NeuralSweepPanel />
                </div>
            </section>

            {/* ── SAM 3 — Interactive Demo ───────────────────────────────── */}
            <section className="space-y-8">
                <div className="space-y-3 reveal" style={{ animationDelay: "560ms" }}>
                    <p className="al-tone-chip">
                        <Sparkles className="h-3 w-3" />
                        Powered by SAM 3
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl">
                        Type a prompt. Get precise masks — instantly.
                    </h2>
                    <p className="max-w-2xl text-muted-foreground">
                        Auto Label Studio routes your text query directly to SAM 3. In seconds every
                        matching object in your dataset gets a pixel-perfect mask — no manual annotation,
                        no training data required.
                    </p>
                </div>

                <div
                    className="al-glass-panel reveal overflow-hidden rounded-[2rem] p-0"
                    style={{ animationDelay: "600ms" }}
                >
                    <SegQueryDemo />
                </div>
            </section>

            {/* ── How it Works ─────────────────────────────────────────────────── */}
            <section id="how-it-works" className="space-y-8">
                <div className="space-y-3 reveal" style={{ animationDelay: "260ms" }}>
                    <p className="al-tone-chip">How it works</p>
                    <h2 className="font-display text-3xl sm:text-4xl">
                        Three steps from upload to labeled dataset.
                    </h2>
                    <p className="max-w-2xl text-muted-foreground">
                        No model training, no configuration, no ops overhead. Just upload, sweep, export.
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex flex-col gap-0 md:flex-row md:items-start">
                    {steps.map((step, i) => (
                        <div key={step.num} className="flex flex-col items-stretch md:flex-row md:flex-1">
                            {/* Step card */}
                            <article
                                className="al-glass-panel reveal card-stack flex-1 rounded-[1.5rem] p-5 sm:p-6"
                                style={{ animationDelay: `${320 + i * 100}ms`, borderColor: `${step.color}40` }}
                            >
                                <p
                                    className="mb-4 font-display text-3xl font-bold"
                                    style={{
                                        background: `linear-gradient(108deg, ${step.color}, #c4b5fd)`,
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    {step.num}
                                </p>
                                <h3 className="font-display text-xl">{step.title}</h3>
                                <p className="mt-3 text-sm text-muted-foreground">{step.detail}</p>
                            </article>

                            {/* Connector arrow (between steps, not after last) */}
                            {i < steps.length - 1 && (
                                <div className="flex items-center justify-center py-2 md:py-0 md:px-2 md:pt-10">
                                    <div className="al-step-connector hidden md:block" />
                                    <div
                                        className="h-8 w-px md:hidden"
                                        style={{
                                            background:
                                                "linear-gradient(180deg, rgba(124,92,252,0.6), rgba(57,213,201,0.6))",
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Feature Grid ─────────────────────────────────────────────────── */}
            <section id="features" className="space-y-8">
                <div className="space-y-3 reveal" style={{ animationDelay: "400ms" }}>
                    <p className="al-tone-chip">Features</p>
                    <h2 className="font-display text-3xl sm:text-4xl">
                        Everything your labeling workflow needs.
                    </h2>
                    <p className="max-w-2xl text-muted-foreground">
                        Auto Label Studio packs enterprise annotation features into a single API call.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((feat, i) => {
                        const Icon = feat.icon;
                        return (
                            <article
                                key={feat.title}
                                className="al-glass-panel al-use-card reveal rounded-[1.5rem] p-5 sm:p-6"
                                style={{ animationDelay: `${460 + i * 80}ms` }}
                            >
                                <div
                                    className="mb-5 inline-flex rounded-xl border bg-background/60 p-3"
                                    style={{ borderColor: "rgba(124,92,252,0.3)" }}
                                >
                                    <Icon className={`h-6 w-6 ${feat.accentClass}`} />
                                </div>
                                <h3 className="font-display text-xl">{feat.title}</h3>
                                <p className="mt-3 text-sm text-muted-foreground">{feat.body}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* ── Stats Bar ────────────────────────────────────────────────────── */}
            <section
                className="al-stat-bar reveal rounded-[1.5rem] px-6 py-6 sm:px-10"
                style={{ animationDelay: "580ms" }}
            >
                <div className="mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-0 sm:divide-x sm:divide-[#7c5cfc]/20">
                    {stats.map((s, i) => (
                        <div
                            key={s.label}
                            className="flex flex-col items-center px-4 text-center sm:px-6 lg:px-10"
                        >
                            <p
                                className="font-display text-3xl font-bold sm:text-4xl"
                                style={{
                                    background: "linear-gradient(108deg, #c4b5fd, #a78bfa 40%, #39d5c9)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                {s.value}
                            </p>
                            <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Use Cases ────────────────────────────────────────────────────── */}
            <section className="space-y-8">
                <div className="space-y-3 reveal" style={{ animationDelay: "620ms" }}>
                    <p className="al-tone-chip">Use Cases</p>
                    <h2 className="font-display text-3xl sm:text-4xl">Built for every computer vision domain.</h2>
                    <p className="max-w-2xl text-muted-foreground">
                        From automotive fleets to hospital scanners, Auto Label Studio adapts to your data
                        without customization.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {useCases.map((uc, i) => (
                        <article
                            key={uc.title}
                            className="al-glass-panel al-use-card reveal rounded-[1.5rem] p-5 sm:p-6"
                            style={{ animationDelay: `${680 + i * 90}ms` }}
                        >
                            <span className="mb-4 block text-4xl">{uc.emoji}</span>
                            <h3 className="font-display text-xl">{uc.title}</h3>
                            <p className="mt-3 text-sm text-muted-foreground">{uc.body}</p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {uc.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                                        style={{
                                            border: "1px solid rgba(124,92,252,0.35)",
                                            background: "rgba(124,92,252,0.1)",
                                            color: "#c4b5fd",
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────────── */}
            <section
                className="al-glass-panel reveal rounded-[2rem] p-6 text-center sm:p-12"
                style={{ animationDelay: "760ms" }}
            >
                {/* Ambient violet glow inside CTA */}
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,252,0.18),transparent_55%)]" />

                <div className="relative z-10">
                    <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#7c5cfc]/50 bg-[#7c5cfc]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                        <Zap className="h-4 w-4" />
                        Ready to auto-label
                    </p>
                    <h2 className="mt-5 font-display text-3xl sm:text-5xl">
                        Start labeling your dataset{" "}
                        <span className="al-gradient-text">today.</span>
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                        Launch your first auto-label job in minutes. No GPU setup, no annotation team, no
                        waiting. Just upload and go.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
                        <a
                            href={`${env.NEXT_PUBLIC_APP_URL}/auto-label`}
                            className="cta-primary w-full sm:w-auto"
                            style={{
                                background: "linear-gradient(120deg, #7c5cfc, #a78bfa)",
                                borderColor: "rgba(124,92,252,0.65)",
                                boxShadow: "0 10px 30px rgba(124,92,252,0.4)",
                                color: "#f5f0ff",
                            }}
                        >
                            Try Auto Label
                            <ArrowRight className="h-4 w-4" />
                        </a>
                        <Link href="/docs" className="cta-ghost w-full sm:w-auto">
                            Read the Docs
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
