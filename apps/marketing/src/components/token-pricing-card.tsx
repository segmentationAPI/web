"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";

const minCents = 2;
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
  const tokens = useMemo(() => cents / 2, [cents]);
  const sliderProgress = ((cents - minCents) / (maxCents - minCents)) * 100;

  return (
    <section
      className="reveal border-primary/40 bg-card text-card-foreground rounded-[1.6rem] border bg-[linear-gradient(152deg,rgba(255,112,63,0.14),transparent_38%),linear-gradient(326deg,rgba(57,213,201,0.09),transparent_45%),rgba(9,12,18,0.8)] p-6 shadow-[0_24px_70px_rgba(5,7,12,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[14px] sm:p-8"
      style={{ animationDelay: "560ms" }}
    >
      <div className="text-muted-foreground inline-flex items-center gap-[0.45rem] px-0 py-0 font-mono text-xs tracking-[0.16em] uppercase">
        <Calculator className="text-secondary h-4 w-4" />
        Token Calculator
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="border-border/70 bg-background/55 rounded-2xl border py-0">
          <div className="p-4">
            <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">Price</p>
            <p className="font-display mt-2 text-4xl">{usdFormatter.format(price)}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Move the slider to estimate token balance.
            </p>
          </div>
        </div>

        <div className="border-border/70 bg-background/55 rounded-2xl border py-0">
          <div className="p-4">
            <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">Tokens</p>
            <p className="font-display mt-2 text-4xl">{integerFormatter.format(tokens)}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              At this balance you can process {integerFormatter.format(tokens)} images, or{" "}
              {integerFormatter.format(tokens)} video frames.
            </p>
          </div>
        </div>
      </div>

      <div className="border-border/70 bg-background/45 mt-6 rounded-2xl border py-0">
        <div className="p-4">
          <input
            type="range"
            min={minCents}
            max={maxCents}
            step={2}
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
      </div>
    </section>
  );
}
