import Link from "next/link";
import type { Route } from "next";

import { env } from "@segmentation/env/web";
import { ArrowRight, CheckCircle, Download, FileJson, ImageIcon, Layers, Rocket, Upload, Zap } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload your images",
    detail:
      "Drag and drop your dataset — JPG, PNG, WebP, GIF, or AVIF. No count limit, up to 10 MB per image.",
  },
  {
    icon: Zap,
    title: "Configure and start",
    detail:
      "Give your project a name, pick an API key, and write a prompt describing what to segment. Review the token estimate, then hit start.",
  },
  {
    icon: Download,
    title: "Download your labels",
    detail:
      "SAM 3 runs on every image in parallel. When done, download your dataset in COCO JSON, per-class PNGs, or YOLO segmentation format.",
  },
] as const;

const formats = [
  {
    icon: FileJson,
    name: "COCO JSON",
    description: "Industry-standard polygon annotations. Drop straight into any training pipeline.",
  },
  {
    icon: Layers,
    name: "Per-class PNGs",
    description: "One binary mask PNG per class per image. Simple to inspect and transform.",
  },
  {
    icon: ImageIcon,
    name: "YOLO Segmentation",
    description: "Normalized polygon TXT files ready for YOLOv8+ segmentation training.",
  },
] as const;

const benefits = [
  "No limit on image count",
  "Supports multi-class segmentation",
  "Pay per image — 1 token each",
  "Results available immediately on completion",
  "All formats included in one job",
] as const;

export default function AutoLabelPage() {
  const appUrl = env.APP_URL.toString();
  const autoLabelUrl = `${appUrl}/auto-label`;

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-16 px-4 pb-24 pt-6 sm:px-8 lg:gap-24">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8 reveal" style={{ animationDelay: "120ms" }}>
          <div className="space-y-5">
            <p className="tone-chip">Auto-Label</p>
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">
              Label your dataset in minutes, not weeks.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Upload a folder of images, write a prompt, and let SAM 3 generate production-ready
              segmentation masks for your entire dataset automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a href={autoLabelUrl} className="cta-primary">
              Start Labeling Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/pricing" className="cta-ghost">
              See Pricing
            </Link>
          </div>

          <ul className="space-y-2.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-secondary" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual card */}
        <article className="glass-panel reveal relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-[80px]" />
          <div className="absolute -right-20 bottom-6 h-52 w-52 rounded-full bg-secondary/25 blur-[90px]" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Project · dataset-v2</span>
              <span className="inline-flex items-center gap-2 text-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
                Processing
              </span>
            </div>

            <div className="space-y-3 rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">Progress</span>
                <span className="font-mono text-foreground">847 / 1,200 images</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: "70.6%" }}
                />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Prompt: <span className="text-foreground">vehicle</span> · COCO JSON + YOLO
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Images", value: "1,200" },
                { label: "Tokens", value: "1,200" },
                { label: "Cost", value: "$12.00" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <p className="font-display text-lg text-foreground">{stat.value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <div className="space-y-3 reveal" style={{ animationDelay: "300ms" }}>
          <p className="tone-chip">How it works</p>
          <h2 className="font-display text-3xl sm:text-4xl">Three steps to a labeled dataset.</h2>
          <p className="max-w-2xl text-muted-foreground">
            No annotation tools to install, no GPU to provision. Just upload, configure, and
            download.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="glass-panel reveal card-stack rounded-[1.5rem] p-6"
                style={{ animationDelay: `${360 + index * 90}ms` }}
              >
                <div className="mb-5 inline-flex rounded-xl border border-border/70 bg-background/60 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Step {index + 1}
                </p>
                <h3 className="font-display text-xl">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{step.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Output formats */}
      <section className="space-y-8">
        <div className="space-y-3 reveal" style={{ animationDelay: "420ms" }}>
          <p className="tone-chip">Output Formats</p>
          <h2 className="font-display text-3xl sm:text-4xl">Every format your pipeline needs.</h2>
          <p className="max-w-2xl text-muted-foreground">
            Select one or all three when creating a project. All formats are generated from the same
            job at no extra cost.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {formats.map((format, index) => {
            const Icon = format.icon;
            return (
              <article
                key={format.name}
                className="glass-panel reveal rounded-[1.5rem] p-6"
                style={{ animationDelay: `${480 + index * 90}ms` }}
              >
                <div className="mb-4 inline-flex rounded-xl border border-border/70 bg-background/60 p-3">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-display text-xl">{format.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{format.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Pricing callout */}
      <section className="glass-panel reveal rounded-[1.8rem] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <p className="tone-chip">Pricing</p>
            <h2 className="font-display text-2xl sm:text-3xl">
              $0.01 per image. That&apos;s it.
            </h2>
            <p className="max-w-xl text-muted-foreground">
              One token per image upload, one token per segmentation run. A dataset of 1,000 images
              costs $10. Tokens never expire and work across the API and Auto-Label.
            </p>
            <Link
              href="/pricing"
              className="inline-flex text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              See full pricing →
            </Link>
          </div>
          <a href={autoLabelUrl} className="cta-primary shrink-0">
            <Rocket className="h-4 w-4" />
            Start Labeling
          </a>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="glass-panel reveal rounded-[2rem] p-8 text-center sm:p-12">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          Ready in minutes
        </p>
        <h2 className="mt-5 font-display text-3xl sm:text-5xl">
          Stop labeling by hand.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Upload your first dataset and get COCO-ready annotations before your next coffee break.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href={autoLabelUrl} className="cta-primary">
            Create a Project
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href={"/docs" as Route} className="cta-ghost">
            Read the Docs
          </Link>
        </div>
      </section>
    </main>
  );
}
