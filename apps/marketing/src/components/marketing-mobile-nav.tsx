"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "./ui/button";

const marketingLinks = [
  { href: "/#features", label: "Features" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
] as const;

export default function MarketingMobileNav({ appUrl }: { appUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            className="rounded-full border-border/70 bg-background/65"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-4" aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-72 rounded-l-2xl border-border/40 bg-card/95 backdrop-blur-xl sm:max-w-72"
      >
        <div className="flex flex-col gap-1 px-5 pt-12 pb-6">
          <SheetTitle className="mb-4 font-display text-base font-semibold tracking-wide">
            Navigation
          </SheetTitle>
          <Separator className="mb-3 bg-border/40" />
          <nav className="flex flex-col gap-1">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 font-mono text-sm uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Separator className="my-3 bg-border/40" />
          <a
            href={appUrl}
            className="cta-primary mt-1 w-full rounded-xl"
          >
            Start Building
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
