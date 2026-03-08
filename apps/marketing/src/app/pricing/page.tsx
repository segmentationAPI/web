import type { Metadata } from "next";

import TokenPricingCard from "@/components/token-pricing-card";
import {
  Cpu,
  Database,
  Eye,
  Gauge,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SegmentationAPI Pricing | SAM 3 API",
  description:
    "Simple token pricing for SegmentationAPI's SAM 3 API: 1 token per processed image or video frame, with each token costing $0.02.",
};

const highlightFeatures = [
  {
    title: "Asset retention",
    description:
      "All input and output images stay available for at least 30 days, so teams can review, audit, and revisit results without building storage infrastructure first.",
    icon: Database,
    kicker: "Retained assets",
    stat: "30 days",
  },
  {
    title: "Preview generation",
    description:
      "Rendered previews are generated automatically for processed outputs, keeping product, ops, and annotation review loops fast from day one.",
    icon: Eye,
    kicker: "Review-ready",
    stat: "Included",
  },
] as const;

const supportFeatures = [
  {
    title: "Model upgrades",
    description: "SAM 3 releases roll into your account automatically.",
    icon: Sparkles,
  },
  {
    title: "Request observability",
    description: "Standard request and response observability is built in.",
    icon: Gauge,
  },
  {
    title: "Output fidelity controls",
    description: "Mask confidence metadata and vector output formats are included.",
    icon: ScanSearch,
  },
  {
    title: "Secure delivery",
    description: "Signed requests and secure key authentication are standard.",
    icon: ShieldCheck,
  },
] as const;

export default function PricingPage() {
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
            1 token covers 1 processed image or 1 processed video frame. Each token costs $0.02.
            Use the calculator and examples below to estimate your spend.
          </p>
        </div>
      </section>

      <TokenPricingCard />

      <section className="reveal overflow-hidden rounded-[2rem] border border-primary/40 bg-[radial-gradient(circle_at_top_right,rgba(57,213,201,0.12),transparent_28%),radial-gradient(circle_at_12%_18%,rgba(255,112,63,0.14),transparent_30%),linear-gradient(180deg,rgba(10,12,19,0.92),rgba(7,9,15,0.96))] shadow-[0_24px_70px_rgba(5,7,12,0.65),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="p-5 md:p-7">
          <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.18em] uppercase">
            <Cpu className="text-primary h-4 w-4" />
            Included in every account
          </p>
        </div>

        <div className="grid gap-6 px-5 pb-5 md:gap-8 md:px-7 md:pb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="max-w-[40rem]">
            <h2 className="font-display text-[2rem] leading-none tracking-[-0.04em] md:text-[3rem]">
              You are not only paying for inference.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-[36rem] text-[0.98rem] leading-[1.7]">
              The platform pieces teams normally end up adding later are already bundled into every
              account, with retained assets and preview generation positioned front and center.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {highlightFeatures.map((feature) => (
              <article
                key={feature.title}
                className="relative overflow-hidden rounded-[1.6rem] border border-primary/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),transparent_44%),linear-gradient(180deg,rgba(255,112,63,0.14),rgba(255,112,63,0.04)_40%,rgba(8,10,17,0.86))] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-mono text-[0.68rem] tracking-[0.18em] uppercase text-[#ffd1ba]">
                    {feature.kicker}
                  </p>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-secondary/40 bg-[rgba(8,11,17,0.52)] text-secondary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="font-display mt-4 text-[clamp(1.45rem,3vw,2.25rem)] leading-[0.98] tracking-[-0.05em]">
                  {feature.stat}
                </p>
                <h3 className="font-display mt-3 text-xl leading-[1.05]">{feature.title}</h3>
                <p className="text-muted-foreground mt-3 text-[0.92rem] leading-[1.65]">
                  {feature.description}
                </p>
                <div className="pointer-events-none absolute bottom-4 left-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(57,213,201,0.12),transparent_72%)] blur-[10px]" />
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 md:gap-x-6 md:gap-y-4 md:px-7 md:pb-7">
          {supportFeatures.map((feature) => (
            <article
              key={feature.title}
              className="grid grid-cols-[auto_1fr] items-start gap-3 border-t border-primary/20 pt-4"
            >
              <feature.icon className="text-secondary mt-0.5 h-4 w-4" />
              <div>
                <h3 className="font-display text-base leading-[1.1]">{feature.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-[0.88rem] leading-[1.55]">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
