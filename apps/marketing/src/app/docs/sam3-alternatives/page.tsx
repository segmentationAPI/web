import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocsPageNav } from "@/components/docs-page-nav";
import { DocsPageHeader } from "@/components/docs-page-header";

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

const vllmColLabels: Record<VllmColKey, string> = {
  sam3: "SAM 3",
  gemini25Pro: "Gemini 2.5 Pro",
  qwen2vl72b: "Qwen2-VL-72B",
  molmo72b: "Molmo-72B",
  dinoX: "DINO-X",
};

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

const sources = [
  {
    label: "DINO-X: A Unified Vision Model for Open-World Object Detection and Understanding (arXiv:2411.14347)",
    note: "Reference for DINO-X model.",
    href: "https://arxiv.org/abs/2411.14347",
  },
  {
    label: "Gemini 2.5 Technical Report — Google DeepMind",
    note: "Reference for Gemini 2.5 Pro model. CountBench and PixMo-Count scores are from the SAM 3 paper.",
    href: "https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf",
  },
  {
    label: "Introducing SAM 3 — Meta AI Blog",
    note: "30 ms per-image latency on H200 with 100+ objects.",
    href: "https://ai.meta.com/blog/segment-anything-model-3/",
  },
  {
    label: "Molmo and PixMo: Open Weights and Open Data for State-of-the-Art VLMs — Deitke et al. (arXiv:2409.17146)",
    note: "Reference for Molmo-72B model. PixMo-Count benchmark originates from this work.",
    href: "https://arxiv.org/abs/2409.17146",
  },
  {
    label: "Qwen2-VL: Enhancing Vision-Language Model's Perception of the World at Any Resolution — Wang et al. (arXiv:2409.12191)",
    note: "Reference for Qwen2-VL-72B model.",
    href: "https://arxiv.org/abs/2409.12191",
  },
  {
    label: "RF-DETR Segmentation — Roboflow Blog",
    note: "RF-DETR Seg COCO mask mAP 50-95 and 4.4 ms latency figures.",
    href: "https://blog.roboflow.com/rf-detr-segmentation-preview/",
  },
  {
    label: "SAM 3: Segment Anything with Concepts — Carion et al., Meta (arXiv:2511.16719, Nov 2025)",
    note: "LVIS zero-shot mask AP, CountBench / PixMo-Count benchmarks, H200 latency, SAM 3 Agent results on ReasonSeg and OmniLabel.",
    href: "https://arxiv.org/abs/2511.16719",
  },
  {
    label: "YOLO11 Documentation — Ultralytics",
    note: "YOLO11n-seg: 1.8 ms latency on T4 TensorRT10, 32.0 COCO mask mAP 50-95.",
    href: "https://docs.ultralytics.com/models/yolo11/",
  },
  {
    label: "YOLOv12 GitHub Repository — sunsmarterjie",
    note: "YOLOv12-N: 1.64 ms latency, 40.6 COCO box mAP 50-95.",
    href: "https://github.com/sunsmarterjie/yolov12",
  },
];

export const metadata: Metadata = {
  title: "SAM3 Alternatives | SegmentationAPI Docs",
  description:
    "Benchmark comparisons, capability matrices, and deployment trade-offs for SAM 3 and its leading alternatives.",
  keywords: [
    "sam3 alternatives",
    "sam3 alternative",
    "segment anything alternatives",
    "SAM 3 vs YOLO",
    "SAM 3 vs RF-DETR",
    "SAM 3 vs SAM 2",
  ],
};

export default function Sam3AlternativesPage() {
  return (
    <>
      <DocsPageHeader
        current="SAM3 Alternatives"
        title="SAM3 Alternatives"
        description={
          <>
            SAM 3 leads in open-vocabulary segmentation quality, but it&apos;s not
            the only option and not always the right one. This page compares SAM 3
            against frontier VLLMs and popular non-VLLM models across benchmarks,
            latency, capabilities, and deployment fit.
          </>
        }
        eyebrow="Last updated: March 3, 2026"
      />

      {/* Table 1: VLLM benchmarks */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">VLLM Benchmark Results</h2>
        <p>
          Counting and localisation on CountBench and PixMo-Count. MAE is
          lower-is-better; accuracy is higher-is-better. Color reflects rank
          within each row — green is best, red is weakest.
        </p>

        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Benchmark</TableHead>
              {vllmCols.map((col) => (
                <TableHead key={col} className="font-mono text-[0.68rem] uppercase tracking-widest">{vllmColLabels[col]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {benchmarkRows.map((row) => {
              const rowVals = vllmCols.map((col) => row[col]);
              return (
                <TableRow key={row.benchmark} className="border-border/15">
                  <TableCell className="font-medium text-foreground">{row.benchmark}</TableCell>
                  {vllmCols.map((col) => (
                    <TableCell
                      key={col}
                      className="font-mono font-semibold tabular-nums"
                      style={scoreStyle(row[col], rowVals, row.higherIsBetter)}
                    >
                      {row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Table 2: Non-VLLM comparison */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">SAM 3 vs YOLO, FastSAM, and RF-DETR</h2>
        <p>
          The models teams most commonly evaluate for segmentation pipelines —
          compared across speed, accuracy, prompting approach, and deployment fit.
        </p>

        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Dimension</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">SAM 3</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">SAM 2</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">YOLO11-seg</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">FastSAM</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">RF-DETR Seg</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">YOLOv12-N</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nonVllmComparisonRows.map((row) => (
              <TableRow key={row.metric} className="border-border/15">
                <TableCell className="font-medium text-foreground">{row.metric}</TableCell>
                <TableCell className="text-muted-foreground">{row.sam3}</TableCell>
                <TableCell className="text-muted-foreground">{row.sam2}</TableCell>
                <TableCell className="text-muted-foreground">{row.yolo11Seg}</TableCell>
                <TableCell className="text-muted-foreground">{row.fastsam}</TableCell>
                <TableCell className="text-muted-foreground">{row.rfdetrSeg}</TableCell>
                <TableCell className="text-muted-foreground">{row.yolov12n}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Table 3: Capability matrix */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">Capability Matrix</h2>
        <p>
          Feature availability at a glance — useful for identifying where a model
          natively covers a workflow versus where custom engineering is needed.
        </p>

        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Capability</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">SAM 3</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">SAM 2</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">YOLO11-seg</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">FastSAM</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">RF-DETR</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Gemini 2.5</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureRows.map((row) => (
              <TableRow key={row.feature} className="border-border/15">
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                {(["sam3", "sam2", "yolo11Seg", "fastsam", "rfdetrSeg", "gemini25Pro"] as const).map(
                  (col) => (
                    <TableCell
                      key={col}
                      className="font-medium"
                      style={capabilityStyle(row[col])}
                    >
                      {row[col]}
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* When to use SAM 3 */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">When to Use SAM 3</h2>
        <p>
          SAM 3 is the strongest model for open-vocabulary perception tasks, built
          for accuracy first. The right strategy depends on where in the pipeline
          the work happens:
        </p>
        <ul>
          <li>
            <strong>Dataset construction & auto-labelling</strong> — Zero-shot mask
            quality is high enough to use directly as training labels without
            domain fine-tuning.
          </li>
          <li>
            <strong>Interactive annotation</strong> — Point and box prompting with
            real-time mask preview makes SAM 3 the best tool for human-in-the-loop
            labelling workflows.
          </li>
          <li>
            <strong>Production edge inference</strong> — Use SAM 3 to generate
            labelled data, then fine-tune YOLO or RF-DETR for sub-5ms edge serving.
          </li>
          <li>
            <strong>Instruction-driven workflows</strong> — SAM 3 Agent decomposes
            complex queries into prompts and calls SAM 3 iteratively, beating prior
            work on ReasonSeg and OmniLabel out of the box.
          </li>
        </ul>
      </div>

      {/* Sources */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">Sources</h2>
        <ol className="list-none! pl-0! space-y-2">
          {sources.map((source, i) => (
            <li key={i} className="flex gap-3 pl-0! before:hidden!">
              <span className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground/50">
                [{i + 1}]
              </span>
              <span>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground/80 underline underline-offset-4 hover:text-foreground"
                >
                  {source.label}
                </a>
                {" — "}
                {source.note}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <DocsPageNav prev={{ href: "/docs/jobs", title: "Jobs" }} />
    </>
  );
}
