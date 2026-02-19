"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "./user-menu";

const dashboardLinks = [
  { href: "/", label: "Overview" },
  { href: "/api-keys", label: "API Keys" },
  { href: "/requests", label: "Requests" },
  { href: "/billing", label: "Billing" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const onDashboard = pathname !== "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-[#2cf4ff]/20 bg-[#03070f]/75 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-[#e8f7ff]"
          >
            Segmentation API
          </Link>
          {onDashboard ? (
            <nav className="hidden items-center gap-2 md:flex">
              {dashboardLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "rounded-none border border-[#8eff6f]/35 bg-[#8eff6f]/18 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#cbffbf] transition"
                      : "rounded-none border border-[#2cf4ff]/30 bg-[#2cf4ff]/5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9bf7ff] transition hover:bg-[#2cf4ff]/14"
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
