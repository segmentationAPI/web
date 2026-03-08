"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu } from "lucide-react";

import { MarketingButton } from "@/components/marketing-primitives";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
            className="border-border/70 bg-background/65 rounded-full"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-4" aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-border/40 bg-card/95 w-72 rounded-l-2xl backdrop-blur-xl sm:max-w-72"
      >
        <div className="flex flex-col gap-1 px-5 pt-12 pb-6">
          <SheetTitle className="font-display mb-4 text-base font-semibold tracking-wide">
            Navigation
          </SheetTitle>
          <Separator className="bg-border/40 mb-3" />
          <nav className="flex flex-col gap-1">
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl px-3 py-2.5 font-mono text-sm tracking-[0.12em] uppercase transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Separator className="bg-border/40 my-3" />
          <MarketingButton href={appUrl} className="mt-1 w-full rounded-xl">
            Start Building
            <ArrowRight className="h-4 w-4" />
          </MarketingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
