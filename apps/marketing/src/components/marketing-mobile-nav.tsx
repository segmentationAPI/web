"use client";

import { Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "./ui/button";

const marketingLinks = [
  { href: "/#features", label: "Features" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
] as const;

export default function MarketingMobileNav({ appUrl }: { appUrl: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon"
            variant="outline"
            className="border-border/70 bg-background/65"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card">
        {marketingLinks.map((link) => (
          <DropdownMenuItem
            key={link.href}
            onClick={() => {
              window.location.assign(link.href);
            }}
            className="font-mono uppercase tracking-[0.12em]"
          >
            {link.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => {
            window.location.assign(appUrl);
          }}
          className="font-mono uppercase tracking-[0.12em] text-primary"
        >
          Start Building
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
