import type { Metadata } from "next";

import Link from "next/link";
import { Check, Cpu, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Segmenta Pricing | SAM 3 API",
  description:
    "Simple tiered pricing for Segmenta's SAM 3 API-as-a-Service, from sandbox usage to enterprise deployment.",
};

const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "Best for prototyping and MVP workflows.",
    features: [
      "20,000 segments / month",
      "Shared inference throughput",
      "Community support",
      "Standard model updates",
    ],
    cta: "Start Free",
  },
  {
    name: "Scale",
    price: "$299",
    cadence: "/month",
    description: "For shipping teams that need predictable latency.",
    features: [
      "2,000,000 segments / month",
      "Dedicated concurrency pools",
      "Priority support",
      "Usage analytics + webhooks",
    ],
    cta: "Start Scale Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For regulated and mission-critical deployments.",
    features: [
      "Private or regional deployment",
      "VPC peering and IP allowlists",
      "Custom SLAs",
      "Security + compliance support",
    ],
    cta: "Talk to Sales",
  },
] as const;

export default function PricingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pb-24 pt-8 sm:px-8">
      <section className="space-y-6 reveal">
        <p className="tone-chip">
          <Sparkles className="h-4 w-4" />
          Pricing
        </p>
        <div className="space-y-4">
          <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
            Start free. Scale without re-architecture.
          </h1>
          <p className="max-w-3xl text-muted-foreground sm:text-lg">
            Segmenta pricing is built around segmentation volume and throughput. Keep one API,
            one integration path, and move tiers as demand grows.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <article
            key={plan.name}
            className="glass-panel reveal rounded-[1.6rem] p-6"
            style={{ animationDelay: `${120 + index * 80}ms` }}
          >
            <h2 className="font-display text-2xl">{plan.name}</h2>
            <p className="mt-4 font-display text-4xl">
              {plan.price}
              <span className="ml-1 text-base text-muted-foreground">{plan.cadence}</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={`${plan.name}-${feature}`} className="inline-flex items-center gap-2 text-foreground">
                  <Check className="h-4 w-4 text-secondary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/docs" className="cta-ghost mt-6 w-full justify-center">
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="glass-panel reveal rounded-[1.8rem] p-6 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Cpu className="h-4 w-4 text-primary" />
          Included in every plan
        </p>
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <p>Model upgrades for SAM 3 releases</p>
          <p>Standard request/response observability</p>
          <p>Mask confidence and vector output formats</p>
          <p>Secure key auth and signed requests</p>
        </div>
      </section>
    </main>
  );
}
