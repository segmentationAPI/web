import Link from "next/link";

import { env } from "@segmentation/env/marketing";

import MarketingMobileNav from "./marketing-mobile-nav";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/35 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-300 items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" className="inline-flex items-center">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/80 bg-background/80 shadow-[0_0_24px_rgba(255,112,63,0.2)]">
            <span className="h-3.5 w-3.5 rotate-45 bg-primary" />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex lg:gap-8">
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 md:gap-0">
          <a href={env.NEXT_PUBLIC_APP_URL} className="cta-primary whitespace-nowrap px-4 py-2 text-sm">
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
