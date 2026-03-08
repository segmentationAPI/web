"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "./ui/button";
import UserMenu from "./user-menu";

import { Suspense } from "react";

const dashboardLinks = [
  { href: "/", label: "Overview" },
  { href: "/studio", label: "Studio" },
  { href: "/history", label: "History" },
] as const;

function HeaderContent() {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname !== "/login";
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="border-border/35 bg-background/70 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3">
            <span className="border-border/80 bg-background/80 grid h-9 w-9 place-items-center rounded-lg border shadow-[0_0_24px_rgba(255,112,63,0.2)]">
              <span className="bg-primary h-3.5 w-3.5 rotate-45" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-base leading-none sm:text-lg">
                SegmentationAPI
              </span>
              <span className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.22em] uppercase sm:block">
                Dashboard
              </span>
            </span>
          </Link>
          {onDashboard ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-border/70 bg-background/65 md:hidden"
                      aria-label="Open dashboard navigation"
                    />
                  }
                >
                  <Menu className="size-4" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card w-52 md:hidden">
                  {dashboardLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      onClick={() => router.push(link.href)}
                      className={
                        isActive(link.href)
                          ? "bg-primary/15 text-foreground font-mono tracking-[0.12em] uppercase"
                          : "text-muted-foreground font-mono tracking-[0.12em] uppercase"
                      }
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <nav className="hidden items-center gap-2 md:flex">
                {dashboardLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      isActive(link.href)
                        ? "border-primary/60 bg-primary/20 text-foreground rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors"
                        : "border-border/70 bg-background/65 text-muted-foreground hover:border-primary/50 hover:text-foreground rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors"
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : null}
        </div>
        <div className="shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense
      fallback={
        <header className="border-border/35 bg-background/70 sticky top-0 z-40 h-[61px] border-b backdrop-blur-xl" />
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
