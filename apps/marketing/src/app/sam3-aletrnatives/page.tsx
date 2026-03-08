import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, Sparkles } from "lucide-react";

// ─── Table 1: VLLM benchmarks ─────────────────────────────────────────────────
type VllmRow = {
  benchmark: string;
  higherIsBetter: boolean;
  sam3: string;
  gemini25Pro: string;
  qwen2vl72b: string;
  molmo72b: string;
  dinoX: string;
};

const benchmarkRows: VllmRow[] = [
  { benchmark: "CountBench MAE", higherIsBetter: false, sam3: "0.12", gemini25Pro: "0.24", qwen2vl72b: "0.28", molmo72b: "0.27", dinoX: "0.62" },
  { benchmark: "CountBench Accuracy (%)", higherIsBetter: true, sam3: "93.8", gemini25Pro: "92.4", qwen2vl72b: "86.7", molmo72b: "92.4", dinoX: "82.9" },
  { benchmark: "PixMo-Count MAE", higherIsBetter: false, sam3: "0.21", gemini25Pro: "0.38", qwen2vl72b: "0.61", molmo72b: "0.17", dinoX: "0.21" },
  { benchmark: "PixMo-Count Accuracy (%)", higherIsBetter: true, sam3: "86.2", gemini25Pro: "78.2", qwen2vl72b: "63.7", molmo72b: "88.8", dinoX: "85.0" },
  { benchmark: "Average Accuracy (%)", higherIsBetter: true, sam3: "90.0", gemini25Pro: "85.3", qwen2vl72b: "75.2", molmo72b: "90.6", dinoX: "84.0" },
  { benchmark: "Average MAE", higherIsBetter: false, sam3: "0.165", gemini25Pro: "0.310", qwen2vl72b: "0.445", molmo72b: "0.220", dinoX: "0.415" },
];

const vllmCols = ["sam3", "gemini25Pro", "qwen2vl72b", "molmo72b", "dinoX"] as const;
type VllmColKey = (typeof vllmCols)[number];

function scoreStyle(value: string, allValues: string[], higherIsBetter: boolean): React.CSSProperties {
  const nums = allValues.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
  const cur = parseFloat(value);
  if (isNaN(cur) || nums.length < 2) return {};
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  const worst = higherIsBetter ? Math.min(...nums) : Math.max(...nums);
  const range = best - worst;
  const ratio = range === 0 ? 1 : (cur - worst) / range;
  const hue = Math.round(ratio * 120);
  return { color: `hsl(${hue}, 70%, 68%)` };
}

// ─── Table 2: Non-VLLM comparison ─────────────────────────────────────────────
// Latency: per-image ms on comparable GPU tier (H200 / T4 TensorRT where published).
// Accuracy: best published mAP on COCO or LVIS (mask AP where available, box AP otherwise).
// Prompt types use consistent short labels. Open-vocab and fit use uniform short phrases.
const nonVllmComparisonRows = [
  {
    metric: "Latency (ms / image)",
    sam3: "~30 ms",
    sam2: "~11 ms",
    yolo11Seg: "~1.8 ms",
    fastsam: "~8 ms",
    rfdetrSeg: "~4.4 ms",
    yolov12n: "~1.6 ms",
  },
  {
    metric: "Accuracy",
    sam3: "48.8 mask AP (LVIS, zero-shot)",
    sam2: "44.7 mask AP (LVIS)",
    yolo11Seg: "32.0 mask mAP (COCO)",
    fastsam: "~37 mask mAP (COCO)",
    rfdetrSeg: "43.1 mask mAP (COCO)",
    yolov12n: "40.6 box mAP (COCO)",
  },
  {
    metric: "Prompt types",
    sam3: "Point · box · text phrase",
    sam2: "Point · box",
    yolo11Seg: "Class label",
    fastsam: "Point · box · text",
    rfdetrSeg: "Class label",
    yolov12n: "Class label",
  },
  {
    metric: "Open-vocabulary",
    sam3: "Yes",
    sam2: "Limited",
    yolo11Seg: "No",
    fastsam: "Limited",
    rfdetrSeg: "No",
    yolov12n: "No",
  },
  {
    metric: "Best fit",
    sam3: "Zero-shot annotation & concept discovery",
    sam2: "Interactive video segmentation",
    yolo11Seg: "Edge segmentation",
    fastsam: "CPU-constrained prompting",
    rfdetrSeg: "Accurate real-time detection",
    yolov12n: "Ultra-fast detection",
  },
  {
    metric: "Main tradeoff",
    sam3: "Slow on edge hardware",
    sam2: "Weaker concept segmentation",
    yolo11Seg: "No open-vocabulary support",
    fastsam: "Lower quality ceiling",
    rfdetrSeg: "Higher runtime complexity",
    yolov12n: "Detection only — no masks",
  },
] as const;

// ─── Table 3: Capability matrix ────────────────────────────────────────────────
type CellValue = "Yes" | "No" | "Strong" | "Weak" | "Partial" | "Memory-bank tracker";

const featureRows: { feature: string; sam3: CellValue; sam2: CellValue; yolo11Seg: CellValue; fastsam: CellValue; rfdetrSeg: CellValue; gemini25Pro: CellValue }[] = [
  { feature: "Zero-shot concept segmentation from noun phrases", sam3: "Yes", sam2: "No", yolo11Seg: "No", fastsam: "Partial", rfdetrSeg: "No", gemini25Pro: "Partial" },
  { feature: "Per-instance segmentation masks", sam3: "Yes", sam2: "Yes", yolo11Seg: "Yes", fastsam: "Yes", rfdetrSeg: "Yes", gemini25Pro: "No" },
  { feature: "Unified image + video detector/tracker", sam3: "Yes", sam2: "Memory-bank tracker", yolo11Seg: "No", fastsam: "No", rfdetrSeg: "No", gemini25Pro: "No" },
  { feature: "Interactive refinement (points/boxes)", sam3: "Yes", sam2: "Yes", yolo11Seg: "No", fastsam: "Yes", rfdetrSeg: "No", gemini25Pro: "No" },
  { feature: "Long instruction reasoning (no external agent)", sam3: "Weak", sam2: "Weak", yolo11Seg: "No", fastsam: "No", rfdetrSeg: "No", gemini25Pro: "Strong" },
];

function capabilityStyle(value: CellValue): React.CSSProperties {
  if (value === "Yes" || value === "Strong") return { color: "hsl(145, 65%, 60%)" };
  if (value === "No" || value === "Weak") return { color: "hsl(0, 72%, 60%)" };
  return { color: "hsl(30, 80%, 62%)" };
}

export const metadata: Metadata = {
  title: "SAM3 Alternatives: Benchmarks, Features, and Deployment Tradeoffs",
  description: "SAM3 alternatives comparison with dense benchmark, non-VLLM, and feature tables across SAM 3 and major alternatives.",
  keywords: ["sam3 alternatives", "sam3 alternative", "segment anything alternatives", "SAM 3 vs YOLO", "SAM 3 vs RF-DETR", "SAM 3 vs SAM 2"],
  alternates: { canonical: "/sam3-aletrnatives" },
  openGraph: {
    title: "SAM3 Alternatives: Full Benchmark and Feature Tables",
    description: "Dense model comparison tables for SAM 3 alternatives with benchmark metrics and deployment tradeoffs.",
    type: "article",
    url: "/sam3-aletrnatives",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAM3 Alternatives: Benchmark Matrix",
    description: "Compare SAM 3 with leading alternatives across benchmarks and practical deployment fit.",
  },
};

export default function Sam3AlternativesPage() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-12 px-4 pb-24 pt-6 sm:gap-16 sm:px-8 sm:pt-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="space-y-6 reveal">
        <p className="tone-chip">
          <Sparkles className="h-4 w-4" />
          SAM3 Alternatives
        </p>
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl lg:text-6xl">
          SAM 3 alternatives and trade-offs
        </h1>
        <div className="space-y-4 text-sm text-muted-foreground sm:text-base lg:text-lg">
          <p>
            SAM 3 is a strong generalist model for open-vocabulary segmentation, but it is far from
            the only option — and not always the right one. This comparison covers the full
            landscape of meaningful alternatives across three distinct lenses.
          </p>
          <p>
            The first table benchmarks SAM 3 against frontier VLLMs — Gemini 2.5 Pro,
            Qwen2-VL-72B, Molmo-72B, and DINO-X — on counting and localisation tasks. The second
            broadens to non-VLLM alternatives: SAM 2, YOLO11-seg, FastSAM, RF-DETR, and
            YOLOv12-N, evaluated on latency, accuracy, and deployment fit. The third maps which
            capabilities each model natively supports.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Last updated: March 3, 2026
        </p>
      </section>

      {/* ── Table 1: VLLM benchmarks ─────────────────────────────────────── */}
      <section className="space-y-5 reveal">
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl">VLLM benchmark results</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Counting and localisation on CountBench and PixMo-Count. MAE is lower-is-better;
            accuracy is higher-is-better. Colour reflects rank within each row — green is best,
            red is weakest.
          </p>
        </div>
        <div className="glass-panel overflow-x-auto rounded-[1.8rem] p-1">
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-4">Benchmark</th>
                <th className="px-5 py-4">SAM 3</th>
                <th className="px-5 py-4">Gemini 2.5 Pro</th>
                <th className="px-5 py-4">Qwen2-VL-72B</th>
                <th className="px-5 py-4">Molmo-72B</th>
                <th className="px-5 py-4">DINO-X</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkRows.map((row) => {
                const rowVals = vllmCols.map((col) => row[col as VllmColKey]);
                return (
                  <tr key={row.benchmark} className="border-t border-border/40 align-middle">
                    <th className="px-5 py-3.5 font-medium">{row.benchmark}</th>
                    {vllmCols.map((col) => {
                      const val = row[col as VllmColKey];
                      return (
                        <td key={col} className="px-5 py-3.5 font-mono font-semibold tabular-nums" style={scoreStyle(val, rowVals, row.higherIsBetter)}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Table 2: Non-VLLM comparison ─────────────────────────────────── */}
      <section className="space-y-5 reveal">
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl">SAM 3 vs YOLO, FastSAM, and RF-DETR</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            The models teams most commonly evaluate for segmentation pipelines — compared across
            speed, accuracy, prompting approach, and deployment fit.
          </p>
        </div>
        <div className="glass-panel overflow-x-auto rounded-[1.8rem] p-1">
          <table className="w-full min-w-[900px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-4">Dimension</th>
                <th className="px-5 py-4">SAM 3</th>
                <th className="px-5 py-4">SAM 2</th>
                <th className="px-5 py-4">YOLO11-seg</th>
                <th className="px-5 py-4">FastSAM</th>
                <th className="px-5 py-4">RF-DETR Seg</th>
                <th className="px-5 py-4">YOLOv12-N</th>
              </tr>
            </thead>
            <tbody>
              {nonVllmComparisonRows.map((row) => (
                <tr key={row.metric} className="border-t border-border/40 align-top">
                  <th className="px-5 py-3.5 font-medium">{row.metric}</th>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.sam3}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.sam2}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.yolo11Seg}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.fastsam}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.rfdetrSeg}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.yolov12n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Table 3: Capability matrix ────────────────────────────────────── */}
      <section className="space-y-5 reveal">
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl">Capability matrix</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Feature availability at a glance — useful for identifying where a model natively covers
            a workflow versus where custom engineering is needed.
          </p>
        </div>
        <div className="glass-panel overflow-x-auto rounded-[1.8rem] p-1">
          <table className="w-full min-w-[820px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-4">Capability</th>
                <th className="px-5 py-4">SAM 3</th>
                <th className="px-5 py-4">SAM 2</th>
                <th className="px-5 py-4">YOLO11-seg</th>
                <th className="px-5 py-4">FastSAM</th>
                <th className="px-5 py-4">RF-DETR</th>
                <th className="px-5 py-4">Gemini 2.5</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr key={row.feature} className="border-t border-border/40 align-top">
                  <th className="px-5 py-3.5 font-medium">{row.feature}</th>
                  {(["sam3", "sam2", "yolo11Seg", "fastsam", "rfdetrSeg", "gemini25Pro"] as const).map((col) => (
                    <td key={col} className="px-5 py-3.5 font-medium" style={capabilityStyle(row[col])}>
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Conclusion ───────────────────────────────────────────────────── */}
      <section className="space-y-4 reveal">
        <h2 className="font-display text-2xl sm:text-3xl">When to use SAM 3</h2>
        <div className="space-y-4 text-sm text-muted-foreground sm:text-base lg:text-lg">
          <p>
            The benchmarks tell a consistent story: SAM 3 is the strongest model available for
            open-vocabulary perception tasks, but it is built for accuracy first and speed second.
            The right deployment strategy depends on where in your pipeline the work happens.
          </p>
          <p>
            For <strong className="text-foreground">dataset construction and auto-labelling</strong>,
            SAM 3 is the clear choice. Its zero-shot mask quality is high enough to use directly
            as training labels — no domain fine-tuning required to get started. Send a batch of
            unlabelled images, get back per-instance masks and bounding boxes, and you have a
            labelled dataset ready for fine-tuning a faster edge model.
          </p>
          <p>
            For <strong className="text-foreground">interactive annotation and refinement</strong>,
            SAM 3&apos;s point and box prompting with real-time mask preview makes it the best tool
            for human-in-the-loop labelling workflows. Annotators click once and get a high-quality
            mask they can accept or refine — far faster than polygon drawing.
          </p>
          <p>
            For <strong className="text-foreground">production edge inference</strong>, SAM 3 is
            generally not the right serving model. The pattern that works is: use SAM 3 to generate
            a labelled dataset, fine-tune a YOLO or RF-DETR model on that data, and serve the
            smaller model at the edge. You get SAM 3-quality annotations driving a model that runs
            in under 5 ms.
          </p>
          <p>
            For <strong className="text-foreground">complex instruction-driven workflows</strong>,
            SAM 3 ships with <strong className="text-foreground">SAM 3 Agent</strong> — a built-in
            multimodal LLM that decomposes complex queries into noun-phrase prompts and calls SAM 3
            iteratively. It beats prior work on ReasonSeg and OmniLabel out of the box, with no
            task-specific training. Available through the{" "}
            <Link href="/docs" className="text-foreground underline underline-offset-4">standard segment endpoint</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="glass-panel reveal rounded-[2rem] p-6 sm:p-10">
        <h2 className="font-display text-3xl sm:text-4xl">Need managed SAM 3 APIs?</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Ship SAM 3 workflows without running your own GPU inference fleet. SegmentationAPI
          handles provisioning, scaling, and versioning — you send requests and receive masks.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/docs" className="cta-primary w-full sm:w-auto">
            Explore API Docs
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="cta-ghost w-full sm:w-auto">
            View Pricing
          </Link>
        </div>
      </section>

    </main>
  );
}
