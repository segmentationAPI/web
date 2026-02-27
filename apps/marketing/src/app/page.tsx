import Link from "next/link";

import { env } from "@segmentation/env/marketing";
import { ArrowRight, Boxes, Braces, Cpu, Radar, ShieldCheck, Zap } from "lucide-react";

const capabilityCards = [
  {
    icon: Radar,
    title: "Temporal Segmentation",
    body: "Track objects across full video sequences with SAM 3 memory turned on by default.",
  },
  {
    icon: Zap,
    title: "Sub-100ms Inference",
    body: "Global edge routing, warm pools, and adaptive batching keep p95 latency tight at scale.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Reliability",
    body: "Signed requests, regional isolation, and immutable audit trails from every endpoint call.",
  },
] as const;

const workflow = [
  {
    title: "Send frame, stream, or dataset",
    detail:
      "Use direct upload, signed URLs, or webhook ingestion from your existing capture pipeline.",
  },
  {
    title: "Prompt with points, boxes, or text",
    detail:
      "Mix prompts in one request to build accurate masks with near-zero post-processing.",
  },
  {
    title: "Receive mask + vectors instantly",
    detail: "Get PNG masks, polygons, and confidence metadata in one deterministic API response.",
  },
] as const;

const sampleRequest = `curl -X POST \\
  https://api.segmentationapi.com/v1/segment \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "prompts": ["painting"],
    "inputS3Key": "inputs/demo-account/upload-001.png",
    "threshold": 0.5,
    "maskThreshold": 0.5
  }'`;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-12 px-4 pb-20 pt-5 sm:gap-16 sm:px-8 lg:gap-24">
      <section id="top" className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
        <div className="space-y-6 reveal" style={{ animationDelay: "120ms" }}>
          <div className="space-y-4">
            <h1 className="font-display text-[2rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Ship pixel-perfect segmentation at machine speed.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base lg:text-lg">
              Build interactive editors, robotics pipelines, and video intelligence with a single
              API. We run Meta&apos;s Segment Anything Model 3 behind an ultra-fast,
              production-ready platform.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <a href={env.NEXT_PUBLIC_APP_URL} className="cta-primary w-full sm:w-auto">
              Start Building
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/docs" className="cta-ghost w-full sm:w-auto">
              View API Docs
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="metric-card">
              <p className="metric-value">90ms</p>
              <p className="metric-label">p95 latency</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">2.4B+</p>
              <p className="metric-label">masks generated</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">99.99%</p>
              <p className="metric-label">uptime SLA</p>
            </article>
          </div>
        </div>

        <article className="glass-panel reveal relative overflow-hidden rounded-[2rem] p-5 sm:p-8">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-[80px]" />
          <div className="absolute -right-20 bottom-6 h-52 w-52 rounded-full bg-secondary/25 blur-[90px]" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Live Pipeline</span>
              <span className="inline-flex items-center gap-2 text-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
                23.8 fps
              </span>
            </div>

            <div className="relative h-64 overflow-hidden rounded-[1.4rem] border border-border/70 bg-[#090b10] sm:h-77.5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,112,63,0.14),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(57,213,201,0.16),transparent_42%),linear-gradient(180deg,#0f1218_0%,#050608_100%)]" />
              <div
                className="absolute left-[10%] top-[16%] h-[42%] w-[34%] border border-primary/70 bg-primary/25"
                style={{ clipPath: "polygon(12% 0,100% 16%,85% 100%,0 82%)" }}
              />
              <div
                className="absolute left-[42%] top-[22%] h-[54%] w-[50%] border border-secondary/75 bg-secondary/20"
                style={{ clipPath: "polygon(0 12%,68% 0,100% 34%,90% 100%,18% 92%)" }}
              />
              <div
                className="absolute bottom-[12%] left-[25%] h-[30%] w-[38%] border border-foreground/50 bg-foreground/10"
                style={{ clipPath: "polygon(6% 0,100% 22%,74% 100%,0 80%)" }}
              />
              <div className="scanline" />

              <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border/70 bg-background/85 p-3 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-2 font-mono text-[11px] text-foreground">
                  <Cpu className="h-3.5 w-3.5" />
                  mask confidence: <span className="signal-text">0.9982</span>
                </p>
                <p className="mt-2 truncate font-mono text-[10px] sm:text-[11px]">
                  subject: cyclist_07 | classes: rider,bike,helmet | points: 2
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section id="features" className="space-y-6 sm:space-y-8">
        <div className="space-y-3 reveal" style={{ animationDelay: "300ms" }}>
          <p className="tone-chip">Why SegmentationAPI</p>
          <h2 className="font-display text-3xl sm:text-4xl">Built for real production pressure.</h2>
          <p className="max-w-2xl text-muted-foreground">
            From pre-launch experimentation to massive deployment, every layer is optimized for
            speed, reliability, and predictable output quality.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {capabilityCards.map((capability, index) => {
            const Icon = capability.icon;

            return (
              <article
                key={capability.title}
                className="glass-panel reveal card-stack rounded-[1.5rem] p-5 sm:p-6"
                style={{ animationDelay: `${360 + index * 90}ms` }}
              >
                <div className="mb-5 inline-flex rounded-xl border border-border/70 bg-background/60 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl">{capability.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{capability.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="docs" className="grid gap-5 lg:grid-cols-[1.04fr_0.96fr] lg:gap-6">
        <article className="glass-panel reveal rounded-[1.8rem] p-5 sm:p-8 lg:h-full">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/60 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Braces className="h-4 w-4 text-primary" />
            Zero-friction API
          </div>
          <h3 className="font-display text-2xl sm:text-3xl">One endpoint. Deterministic masks.</h3>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Bring your own frame source and keep your stack exactly as-is. SegmentationAPI returns
            masks, polygons, confidence, and tracking IDs in one response.
          </p>
          <div className="soft-divider my-6" />
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-4 text-xs leading-relaxed text-[#ffcaa9] sm:text-sm">
            <code>{sampleRequest}</code>
          </pre>
        </article>

        <div className="space-y-4 lg:grid lg:h-full lg:grid-rows-3 lg:gap-4 lg:space-y-0">
          {workflow.map((step, index) => (
            <article
              key={step.title}
              className="glass-panel reveal rounded-[1.4rem] p-5 lg:h-full"
              style={{ animationDelay: `${420 + index * 90}ms` }}
            >
              <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Boxes className="h-4 w-4 text-secondary" />
                Step {index + 1}
              </p>
              <h3 className="font-display text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="space-y-6 sm:space-y-8">
        <div className="space-y-3 reveal" style={{ animationDelay: "520ms" }}>
          <p className="tone-chip">Pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl">Simple token pricing.</h2>
          <p className="max-w-2xl text-muted-foreground">
            $0.01 gets you 2 tokens. One token is used for S3 input upload, and one token is used
            when segmentation runs.
          </p>
          <Link
            href="/pricing"
            className="inline-flex text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            See full pricing
          </Link>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[2rem] p-6 text-center sm:p-12">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Cpu className="h-4 w-4 text-primary" />
          Ready when you are
        </p>
        <h2 className="mt-5 font-display text-3xl sm:text-5xl">
          Plug in once. Segment anything everywhere.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Launch your first request in minutes and skip the GPU ops burden entirely.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <a href={env.NEXT_PUBLIC_APP_URL} className="cta-primary w-full sm:w-auto">
            Create Account
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/docs" className="cta-ghost w-full sm:w-auto">
            Explore Docs
          </Link>
        </div>
      </section>
    </main>
  );
}
