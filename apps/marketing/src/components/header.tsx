import Link from "next/link";

import { env } from "@segmentation/env/web";

export default function Header() {
  const appUrl = env.APP_URL.toString();

  return (
    <header className="sticky top-0 z-40 border-b border-border/35 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-300 items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/80 bg-background/80 shadow-[0_0_24px_rgba(255,112,63,0.2)]">
            <span className="h-3.5 w-3.5 rotate-45 bg-primary" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-lg leading-none">SegmentationAPI</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              SAM 3 API
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
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

        <a href={appUrl} className="cta-primary px-4 py-2 text-sm">
          Start Building
        </a>
      </div>
    </header>
  );
}
