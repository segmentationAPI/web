import Link from "next/link";

import { env } from "@segmentation/env/marketing";
import { ArrowRight } from "lucide-react";

import {
  GlassCard,
  MarketingButton,
  MarketingButtonLink,
  MetricCard,
  ToneChip,
} from "@/components/marketing-primitives";
import { LiveDemo } from "./live-demo";
import { VideoDemo } from "./video-demo";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-20 px-4 pt-8 pb-24 sm:gap-28 sm:px-8 lg:gap-36">
      <section className="grid gap-8 sm:gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
        <div className="reveal space-y-8" style={{ animationDelay: "120ms" }}>
          <div className="space-y-5">
            <h1 className="font-display text-[1.75rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Ship pixel-perfect segmentation at machine speed.
            </h1>
            <p className="text-muted-foreground max-w-xl text-base leading-relaxed lg:text-lg">
              One API for auto-labelling, annotation tools, and video segmentation — powered by
              Meta&apos;s Segment Anything Model 3.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <MarketingButton href={env.NEXT_PUBLIC_APP_URL} className="w-full sm:w-auto">
              Start Building
              <ArrowRight className="h-4 w-4" />
            </MarketingButton>
            <MarketingButtonLink href="/docs" variant="ghost" className="w-full sm:w-auto">
              View Docs
            </MarketingButtonLink>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricCard value="500ms" label="per image" />
            <MetricCard value="2.4B+" label="masks generated" />
            <MetricCard value="99.99%" label="uptime SLA" />
          </div>
        </div>

        <LiveDemo />
      </section>

      <section className="reveal mx-auto flex w-full max-w-4xl flex-col items-center gap-10">
        <div className="space-y-4 text-center">
          <ToneChip className="mx-auto">
            <span className="bg-secondary h-1.5 w-1.5 rounded-full" />
            Video Segmentation
          </ToneChip>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl md:text-5xl">
            Frame-by-frame,{" "}
            <span className="bg-[linear-gradient(108deg,#ffcb9e_4%,#39d5c9_52%,#ffeecc_94%)] bg-clip-text text-transparent">
              fully automatic.
            </span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-xl text-base leading-relaxed lg:text-lg">
            Track and segment objects across every frame of a video with a single text prompt — no
            manual annotation required.
          </p>
        </div>
        <VideoDemo />
      </section>

      <GlassCard className="reveal rounded-2xl p-6 text-center sm:rounded-[2rem] sm:p-14">
        <h2 className="font-display text-2xl sm:text-3xl md:text-5xl">
          Plug in once. Segment anything everywhere.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
          Launch your first request in minutes and skip the GPU ops burden entirely.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <MarketingButton href={env.NEXT_PUBLIC_APP_URL} className="w-full sm:w-auto">
            Create Account
            <ArrowRight className="h-4 w-4" />
          </MarketingButton>
          <MarketingButtonLink href="/docs" variant="ghost" className="w-full sm:w-auto">
            Explore Docs
          </MarketingButtonLink>
        </div>
      </GlassCard>
    </main>
  );
}
