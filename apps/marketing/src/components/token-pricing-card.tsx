"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";

const minCents = 1;
const maxCents = 10000;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("en-US");

export default function TokenPricingCard() {
  const [cents, setCents] = useState(500);

  const price = cents / 100;
  const tokens = useMemo(() => cents * 2, [cents]);
  const fullRuns = useMemo(() => Math.floor(tokens / 2), [tokens]);
  const sliderProgress = ((cents - minCents) / (maxCents - minCents)) * 100;

  return (
    <article
      className="glass-panel reveal rounded-[1.6rem] p-6 sm:p-8"
      style={{ animationDelay: "560ms" }}
    >
      <p className="text-muted-foreground inline-flex items-center gap-2 font-mono text-xs tracking-[0.18em] uppercase">
        <Calculator className="text-secondary h-4 w-4" />
        Token Calculator
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="border-border/70 bg-background/55 rounded-2xl border p-4">
          <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">Price</p>
          <p className="font-display mt-2 text-4xl">{usdFormatter.format(price)}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Move the slider to estimate token balance.
          </p>
        </div>

        <div className="border-border/70 bg-background/55 rounded-2xl border p-4">
          <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">Tokens</p>
          <p className="font-display mt-2 text-4xl">{integerFormatter.format(tokens)}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            At this balance you can run up to {integerFormatter.format(fullRuns)} full upload +
            segmentation cycles.
          </p>
        </div>
      </div>

      <div className="border-border/70 bg-background/45 mt-6 rounded-2xl border p-4">
        <input
          type="range"
          min={minCents}
          max={maxCents}
          step={1}
          value={cents}
          onChange={(event) => setCents(Number(event.target.value))}
          aria-label="Pricing slider"
          className="h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, var(--primary) 92%, white) ${sliderProgress}%, color-mix(in srgb, var(--primary) 22%, transparent) ${sliderProgress}%)`,
          }}
        />
        <div className="text-muted-foreground mt-2 flex items-center justify-between font-mono text-[11px] tracking-[0.14em] uppercase">
          <span>{usdFormatter.format(minCents / 100)}</span>
          <span>{usdFormatter.format(maxCents / 100)}</span>
        </div>
      </div>
    </article>
  );
}
