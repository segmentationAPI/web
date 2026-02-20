import type { Metadata } from "next";

import { ArrowRight, Boxes, Cpu, Sparkles } from "lucide-react";

import { env } from "@segmentation/env/web";

const workflowSteps = [
  {
    detail: "Sign in, open the dashboard playground, and paste an active key from API Keys.",
    title: "Sign in and paste API key",
  },
  {
    detail: "Upload any image, add a prompt like person or bicycle, and tune thresholds if needed.",
    title: "Upload image + write prompt",
  },
  {
    detail: "Review color overlays, confidence scores, and request metadata immediately.",
    title: "See mask overlays and scores",
  },
] as const;

export const metadata: Metadata = {
  title: "SegmentationAPI Playground | Interactive SAM 3 Segmentation",
  description:
    "Try SegmentationAPI in your browser. Upload an image, run prompt-based segmentation, and inspect overlays and confidence scores live.",
};

export default function PlaygroundMarketingPage() {
  const appUrl = env.APP_URL.toString().replace(/\/+$/, "");
  const playgroundUrl = `${appUrl}/playground`;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pb-24 pt-8 sm:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
        <div className="space-y-6 reveal">
          <p className="tone-chip">
            <Sparkles className="h-4 w-4" />
            Interactive Playground
          </p>
          <div className="space-y-4">
            <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
              Try segmentation live in your browser
            </h1>
            <p className="max-w-2xl text-muted-foreground sm:text-lg">
              No SDK setup required. Paste an API key, upload an image, and see mask overlays with
              per-instance confidence in seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href={playgroundUrl} className="cta-primary">
              Open Playground
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={appUrl} className="cta-ghost">
              Create Account
            </a>
          </div>
        </div>

        <article className="glass-panel reveal relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="absolute -left-14 -top-18 h-52 w-52 rounded-full bg-primary/28 blur-[74px]" />
          <div className="absolute -right-16 bottom-3 h-46 w-46 rounded-full bg-secondary/26 blur-[78px]" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Playground Preview</span>
              <span className="inline-flex items-center gap-2 text-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
                Live
              </span>
            </div>

            <div className="relative h-80 overflow-hidden rounded-[1.4rem] border border-border/70 bg-[#090b10]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,112,63,0.14),transparent_37%),radial-gradient(circle_at_80%_82%,rgba(57,213,201,0.16),transparent_43%),linear-gradient(180deg,#0f1218_0%,#050608_100%)]" />

              <div className="absolute inset-y-0 left-0 w-[42%] border-r border-border/70 bg-background/45">
                <div className="space-y-2 p-3">
                  <div className="h-6 rounded-md border border-border/70 bg-muted/55" />
                  <div className="h-20 rounded-md border border-border/70 bg-muted/45" />
                  <div className="h-24 rounded-md border border-border/70 bg-muted/45" />
                  <div className="h-8 rounded-md border border-primary/45 bg-primary/20" />
                </div>
              </div>

              <div className="absolute inset-y-0 right-0 w-[58%] bg-background/35">
                <div
                  className="absolute left-[12%] top-[14%] h-[36%] w-[30%] border border-primary/70 bg-primary/25"
                  style={{ clipPath: "polygon(12% 0,100% 16%,86% 100%,0 82%)" }}
                />
                <div
                  className="absolute left-[34%] top-[18%] h-[58%] w-[54%] border border-secondary/75 bg-secondary/20"
                  style={{ clipPath: "polygon(0 12%,68% 0,100% 34%,90% 100%,18% 92%)" }}
                />
                <div
                  className="absolute bottom-[12%] left-[24%] h-[30%] w-[40%] border border-foreground/45 bg-foreground/10"
                  style={{ clipPath: "polygon(6% 0,100% 22%,74% 100%,0 80%)" }}
                />
              </div>

              <div className="scanline" />

              <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border/70 bg-background/85 p-3 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-2 font-mono text-[11px] text-foreground">
                  <Cpu className="h-3.5 w-3.5" />
                  segmentation score: <span className="signal-text">0.9924</span>
                </p>
                <p className="mt-2 truncate font-mono text-[10px] sm:text-[11px]">
                  prompt: person | masks: 3 | threshold: 0.50
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-5">
        <div className="space-y-3 reveal" style={{ animationDelay: "140ms" }}>
          <p className="tone-chip">Workflow</p>
          <h2 className="font-display text-3xl sm:text-4xl">From key to overlays in three steps</h2>
          <p className="max-w-3xl text-muted-foreground">
            The playground mirrors real API behavior so you can test prompts, thresholds, and
            outputs before integrating code.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <article
              key={step.title}
              className="glass-panel reveal rounded-[1.4rem] p-5"
              style={{ animationDelay: `${220 + index * 90}ms` }}
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

      <section className="glass-panel reveal rounded-[2rem] p-8 text-center sm:p-12">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Playground Access
        </p>
        <h2 className="mt-5 font-display text-3xl sm:text-5xl">Validate prompts before shipping.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Run live requests against your account and inspect masks instantly from the dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href={playgroundUrl} className="cta-primary">
            Open Playground
            <ArrowRight className="h-4 w-4" />
          </a>
          <a href={appUrl} className="cta-ghost">
            Create Account
          </a>
        </div>
      </section>
    </main>
  );
}
