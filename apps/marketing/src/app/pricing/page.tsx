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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-6 pb-20 sm:gap-10 sm:px-8 sm:pt-8">
      <section className="reveal space-y-5 sm:space-y-6">
        <p className="tone-chip">
          <Sparkles className="h-4 w-4" />
          Pricing
        </p>
        <div className="space-y-3 sm:space-y-4">
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl lg:text-6xl">
            Token pricing that stays predictable.
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm sm:text-base lg:text-lg">
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
        <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase">
          <Coins className="text-secondary h-4 w-4" />
          Token Consumption
        </p>

        <div className="mt-5 grid gap-3 md:auto-rows-fr md:grid-cols-[minmax(14rem,1fr)_auto_minmax(14rem,1fr)_auto_minmax(14rem,1fr)]">
          <article className="border-border/70 bg-background/50 h-full rounded-2xl border p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
              <uploadToken.icon className="text-primary h-4 w-4" />
              {uploadToken.title}
            </p>
            <p className="font-display mt-3 text-3xl leading-8 md:mt-0">{uploadToken.tokens}</p>
            <p className="text-muted-foreground mt-2 text-xs md:mt-0">{uploadToken.detail}</p>
          </article>

          <div className="flex items-center justify-center py-1 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3 md:px-1 md:py-4">
            <p className="font-display text-muted-foreground text-center text-2xl leading-8 md:row-start-2 md:text-3xl">
              +
            </p>
          </div>

          <article className="border-border/70 bg-background/50 h-full rounded-2xl border p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
              <segmentationToken.icon className="text-primary h-4 w-4" />
              {segmentationToken.title}
            </p>
            <p className="font-display mt-3 text-3xl leading-8 md:mt-0">
              {segmentationToken.tokens}
            </p>
            <p className="text-muted-foreground mt-2 text-xs md:mt-0">{segmentationToken.detail}</p>
          </article>

          <div className="flex items-center justify-center py-1 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3 md:px-1 md:py-4">
            <p className="font-display text-muted-foreground text-center text-2xl leading-8 md:row-start-2 md:text-3xl">
              =
            </p>
          </div>

          <article className="border-primary/35 bg-primary/10 h-full rounded-2xl border p-4 md:grid md:grid-rows-[1.25rem_2rem_1fr] md:gap-y-3">
            <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
              <RefreshCw className="text-primary h-4 w-4" />
              Full Request Cycle
            </p>
            <p className="font-display text-foreground mt-3 text-3xl leading-8 md:mt-0">2 tokens</p>
            <p className="text-muted-foreground mt-2 text-xs md:mt-0">
              Upload one image and run one segmentation.
            </p>
          </article>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.8rem] p-5 sm:p-8">
        <p className="text-muted-foreground mb-4 inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase">
          <Cpu className="text-primary h-4 w-4" />
          Included in every account
        </p>
        <div className="text-muted-foreground grid gap-3 text-xs sm:grid-cols-2 sm:text-sm">
          <p>Model upgrades for SAM 3 releases</p>
          <p>Standard request/response observability</p>
          <p>Mask confidence and vector output formats</p>
          <p>Secure key auth and signed requests</p>
        </div>
      </section>
    </main>
  );
}
