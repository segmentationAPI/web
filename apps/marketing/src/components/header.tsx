import Image from "next/image";
import Link from "next/link";

import { env } from "@segmentation/env/marketing";

import MarketingMobileNav from "./marketing-mobile-nav";

export default function Header() {
  return (
    <header className="border-border/35 bg-background/70 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-300 items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" className="inline-flex min-w-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="SegmentationAPI logo"
            width={36}
            height={36}
            className="shrink-0"
          />
          <span className="hidden min-w-0 md:block">
            <span className="font-display block truncate text-lg leading-none">
              SegmentationAPI
            </span>
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em] uppercase">
              SAM 3 API
            </span>
          </span>
        </Link>

        <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex lg:gap-8">
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 md:gap-0">
          <a
            href={env.NEXT_PUBLIC_APP_URL}
            className="cta-primary px-4 py-2 text-sm whitespace-nowrap"
          >
            Start Building
          </a>
          <div className="md:hidden">
            <MarketingMobileNav appUrl={env.NEXT_PUBLIC_APP_URL} />
          </div>
        </div>
      </div>
    </header>
  );
}
