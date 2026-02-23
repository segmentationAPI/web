import type { Metadata } from "next";

import TokenPricingCard from "@/components/token-pricing-card";
import { CloudUpload, Coins, Cpu, RefreshCw, Scissors, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "SegmentationAPI Pricing | SAM 3 API",
  description:
    "Simple token pricing for SegmentationAPI's SAM 3 API: $0.01 gets 2 tokens with predictable usage per upload and segmentation run.",
};

const tokenConsumption = [
  {
    title: "Input Upload",
    tokens: "1 token",
    detail: "Consumed when an input image is uploaded to our S3 bucket.",
    icon: CloudUpload,
  },
  {
    title: "Segmentation Run",
    tokens: "1 token",
    detail: "Consumed each time segmentation runs.",
    icon: Scissors,
  },
] as const;

export default function PricingPage() {
  const [uploadToken, segmentationToken] = tokenConsumption;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pb-20 pt-6 sm:gap-10 sm:px-8 sm:pt-8">
      <section className="space-y-5 reveal sm:space-y-6">
        <p className="tone-chip">
          <Sparkles className="h-4 w-4" />
          Pricing
        </p>
        <div className="space-y-3 sm:space-y-4">
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl lg:text-6xl">
            Token pricing that stays predictable.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base lg:text-lg">
            $0.01 gets you 2 tokens. Use the calculator and token usage cards below to estimate your
            spend.
          </p>
        </div>
      </section>

      <TokenPricingCard />

      <section
        className="glass-panel reveal rounded-[1.8rem] p-5 sm:p-8"
        style={{ animationDelay: "620ms" }}
      >
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Coins className="h-4 w-4 text-secondary" />
          Token Consumption
        </p>

        <div className="mt-5 grid gap-3 md:auto-rows-fr md:grid-cols-[minmax(14rem,1fr)_auto_minmax(14rem,1fr)_auto_minmax(14rem,1fr)]">
          <article className="h-full rounded-2xl border border-border/70 bg-background/50 p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <uploadToken.icon className="h-4 w-4 text-primary" />
              {uploadToken.title}
            </p>
            <p className="mt-3 font-display text-3xl leading-8 md:mt-0">{uploadToken.tokens}</p>
            <p className="mt-2 text-xs text-muted-foreground md:mt-0">{uploadToken.detail}</p>
          </article>

          <div className="hidden md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3 md:px-1 md:py-4">
            <p className="row-start-2 text-center font-display text-3xl leading-8 text-muted-foreground">
              +
            </p>
          </div>

          <article className="h-full rounded-2xl border border-border/70 bg-background/50 p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <segmentationToken.icon className="h-4 w-4 text-primary" />
              {segmentationToken.title}
            </p>
            <p className="mt-3 font-display text-3xl leading-8 md:mt-0">
              {segmentationToken.tokens}
            </p>
            <p className="mt-2 text-xs text-muted-foreground md:mt-0">{segmentationToken.detail}</p>
          </article>

          <div className="hidden md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3 md:px-1 md:py-4">
            <p className="row-start-2 text-center font-display text-3xl leading-8 text-muted-foreground">
              =
            </p>
          </div>

          <article className="h-full rounded-2xl border border-primary/35 bg-primary/10 p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <RefreshCw className="h-4 w-4 text-primary" />
              Full Request Cycle
            </p>
            <p className="mt-3 font-display text-3xl leading-8 text-foreground md:mt-0">2 tokens</p>
            <p className="mt-2 text-xs text-muted-foreground md:mt-0">
              Upload one image and run one segmentation.
            </p>
          </article>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.8rem] p-5 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Cpu className="h-4 w-4 text-primary" />
          Included in every account
        </p>
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm">
          <p>Model upgrades for SAM 3 releases</p>
          <p>Standard request/response observability</p>
          <p>Mask confidence and vector output formats</p>
          <p>Secure key auth and signed requests</p>
        </div>
      </section>
    </main>
  );
}
