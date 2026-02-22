import Link from "next/link";

import { env } from "@segmentation/env/marketing";
import { ArrowRight, Boxes, Braces, Cpu, Radar, ShieldCheck, Zap } from "lucide-react";
import { SegQueryDemo } from "../components/seg-query-demo";
import { SegVideoDemo } from "../components/seg-video-demo";

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
      "Mix prompt modes in one request to build accurate masks with near-zero post-processing.",
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
    "prompt": "painting",
    "inputS3Key": "inputs/demo-account/upload-001.png",
    "threshold": 0.5,
    "mask_threshold": 0.5
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

        <div className="reveal relative w-full">
          <div className="absolute -left-16 -top-20 z-0 h-56 w-56 rounded-full bg-primary/30 blur-[80px]" />
          <div className="absolute -right-20 bottom-6 z-0 h-52 w-52 rounded-full bg-secondary/25 blur-[90px]" />

          <SegQueryDemo
            query="clock"
            beforeImage="/clock-before.jpg"
            afterImage="/clock-after.jpg"
            beforeAlt="The Persistence of Memory - original"
            afterAlt="The Persistence of Memory - after auto segmentation"
            labelCountText="✓ 5 masks"
            labelDetailedText="5 objects · 98.2% confidence"
            filename="dalí-memory.jpg"
            className="relative z-10 h-[24rem] w-full sm:h-[28rem] lg:h-[30rem] border border-border/70 shadow-2xl shadow-primary/5 shadow-primary/20"
          />
        </div>
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

      <section className="space-y-6 sm:space-y-8">
        <div className="space-y-3 reveal" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-3">
            <p className="tone-chip">Video Auto Tracking</p>
            <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary">
              Coming soon
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl">Track objects across frames automatically.</h2>
          <p className="max-w-2xl text-muted-foreground">
            Streamline your video annotation pipeline. Provide a text prompt and SAM 3 flawlessly tracks matching targets temporally across full sequences.
          </p>
        </div>

        <div className="reveal relative w-full" style={{ animationDelay: "300ms" }}>
          <SegVideoDemo
            query="Spiderman"
            videoSrc="/spiderman.mp4"
            filename="spiderman.mp4"
            className="relative z-10 h-[24rem] w-full sm:h-[28rem] lg:h-[30rem] border border-border/70 shadow-2xl shadow-secondary/5"
            labelCountText="✓ 1 track"
            labelDetailedText="1 object tracked · 98.8% confidence"
          />
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
