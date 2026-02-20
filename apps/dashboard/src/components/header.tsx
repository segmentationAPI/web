"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "./user-menu";

const dashboardLinks = [
  { href: "/", label: "Overview" },
  { href: "/api-keys", label: "API Keys" },
  { href: "/playground", label: "Playground" },
  { href: "/requests", label: "Requests" },
  { href: "/billing", label: "Billing" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const onDashboard = pathname !== "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-border/35 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/80 bg-background/80 shadow-[0_0_24px_rgba(255,112,63,0.2)]">
              <span className="h-3.5 w-3.5 rotate-45 bg-primary" />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-lg leading-none">SegmentationAPI</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Dashboard
              </span>
            </span>
          </Link>
          {onDashboard ? (
            <nav className="hidden items-center gap-2 md:flex">
              {dashboardLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "rounded-full border border-primary/60 bg-primary/20 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors"
                      : "rounded-full border border-border/70 bg-background/65 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
