import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MarketingButton({
  className,
  variant = "primary",
  href,
  children,
  ...props
}: React.ComponentProps<"a"> & { variant?: "primary" | "ghost" }) {
  return (
    <a
      className={cn(
        "inline-flex h-auto items-center justify-center gap-1.5 rounded-[0.85rem] px-4 py-3 text-sm font-semibold whitespace-nowrap transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px",
        variant === "primary"
          ? "border-primary/65 bg-linear-to-r from-primary to-[#ff9351] text-[#1c110d] shadow-[0_10px_30px_rgba(255,112,63,0.35)] hover:bg-linear-to-r hover:from-primary hover:to-[#ff9351] hover:shadow-[0_14px_36px_rgba(255,112,63,0.45)]"
          : "border-primary/42 bg-[#080b11bf] text-foreground hover:bg-[#080b11bf] hover:border-secondary/60 hover:text-foreground",
        className,
      )}
      href={href}
      {...props}
    >
      {children}
    </a>
  );
}

export function MarketingButtonLink({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: "primary" | "ghost" }) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant: "outline" }),
        "inline-flex h-auto rounded-[0.85rem] px-4 py-3 text-sm whitespace-nowrap transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px",
        variant === "primary"
          ? "border-primary/65 bg-linear-to-r from-primary to-[#ff9351] font-semibold text-[#1c110d] shadow-[0_10px_30px_rgba(255,112,63,0.35)] hover:bg-linear-to-r hover:from-primary hover:to-[#ff9351] hover:text-[#1c110d] hover:shadow-[0_14px_36px_rgba(255,112,63,0.45)]"
          : "border-primary/42 bg-[#080b11bf] font-medium text-foreground hover:border-secondary/60 hover:bg-[#080b11bf] hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function ToneChip({ className, children }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-[0.45rem] rounded-full border border-primary/75 bg-primary/18 px-[0.8rem] py-[0.45rem] font-mono text-[0.65rem] tracking-[0.16em] uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "border-primary/40 bg-[linear-gradient(152deg,rgba(255,112,63,0.14),transparent_38%),linear-gradient(326deg,rgba(57,213,201,0.09),transparent_45%),rgba(9,12,18,0.8)] shadow-[0_24px_70px_rgba(5,7,12,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[14px]",
        className,
      )}
      {...props}
    />
  );
}

export function MetricCard({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-[0.85rem] border-primary/40 bg-[#080b11b8] py-0 sm:rounded-[1.05rem]",
        className,
      )}
    >
      <CardContent className="p-[0.65rem] sm:p-[0.95rem]">
        <p className="font-display text-[1.5rem] leading-none sm:text-[1.8rem]">{value}</p>
        <p className="text-muted-foreground mt-[0.3rem] text-[0.6rem] tracking-[0.1em] uppercase sm:mt-[0.45rem] sm:text-[0.75rem] sm:tracking-[0.15em]">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

export function FeatureStatCard({
  title,
  description,
  kicker,
  stat,
  icon: Icon,
}: {
  title: string;
  description: string;
  kicker: string;
  stat: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-primary/30 relative rounded-[1.6rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.03),transparent_44%),linear-gradient(180deg,rgba(255,112,63,0.14),rgba(255,112,63,0.04)_40%,rgba(8,10,17,0.86))] py-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-[0.68rem] tracking-[0.18em] text-[#ffd1ba] uppercase">
            {kicker}
          </p>
          <div className="border-secondary/40 text-secondary inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border bg-[rgba(8,11,17,0.52)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="font-display mt-4 text-[clamp(1.45rem,3vw,2.25rem)] leading-[0.98] tracking-[-0.05em]">
          {stat}
        </p>
        <h3 className="font-display mt-3 text-xl leading-[1.05]">{title}</h3>
        <p className="text-muted-foreground mt-3 text-[0.92rem] leading-[1.65]">{description}</p>
      </CardContent>
    </Card>
  );
}
