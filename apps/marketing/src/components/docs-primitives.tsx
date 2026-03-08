import Link from "next/link";
import type { Route } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DocsContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16 sm:px-8 sm:pt-10 sm:pb-20">
      {children}
    </div>
  );
}

export function DocsBreadcrumb({ current }: { current: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="reveal text-muted-foreground mb-8 flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.12em] uppercase"
    >
      <Link href="/docs" className="hover:text-foreground transition-colors">
        Docs
      </Link>
      <span aria-hidden="true" className="text-muted-foreground/40">
        /
      </span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function DocsPageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display mb-3 text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] sm:text-[2.75rem]">
      {children}
    </h1>
  );
}

export function DocsLead({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mb-10 text-[1.05rem] leading-[1.7]">{children}</p>;
}

export function DocsEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground -mt-2 mb-8 font-mono text-[0.75rem] tracking-[0.16em] uppercase">
      {children}
    </div>
  );
}

export function DocsSection({ className, children }: React.ComponentProps<"section">) {
  return <section className={cn("reveal mt-10", className)}>{children}</section>;
}

export function DocsH2({ className, children }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-display mb-4 border-b border-primary/22 pb-[0.65rem] text-2xl font-semibold tracking-[-0.015em]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function DocsH3({ className, children }: React.ComponentProps<"h3">) {
  return (
    <h3 className={cn("font-display mb-[0.65rem] mt-8 text-[1.15rem] font-semibold", className)}>
      {children}
    </h3>
  );
}

export function DocsProse({ className, children }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-[0.925rem] leading-[1.75] text-[color-mix(in_srgb,var(--foreground)_80%,transparent)] break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:transition-colors hover:[&_a]:text-secondary [&_code]:break-all [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mb-5 [&_ul]:list-none [&_ul]:space-y-[0.45rem] [&_ul]:pl-0 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.55em] [&_li]:before:h-[5px] [&_li]:before:w-[5px] [&_li]:before:rotate-45 [&_li]:before:rounded-[1px] [&_li]:before:bg-primary [&_li]:before:opacity-70",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DocsInlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}

export function DocsMethodBadge({
  method,
  className,
}: {
  method: "GET" | "POST" | "PUT";
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-[0.35rem] px-[0.55rem] py-[0.2rem] font-mono text-[0.65rem] font-bold tracking-[0.08em] uppercase",
        method === "GET" && "border-[#39d5c94d] bg-[#39d5c926] text-secondary",
        method === "POST" && "border-primary/30 bg-primary/15 text-primary",
        method === "PUT" && "border-[#f2b77a4d] bg-[#f2b77a26] text-[#f2b77a]",
        className,
      )}
    >
      {method}
    </Badge>
  );
}

export function DocsEndpointCard({ className, children }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-primary/22 bg-[#090c12a6] py-0 transition-[border-color,background] duration-200 hover:border-primary/45 hover:bg-[#0c1018b3]",
        className,
      )}
    >
      <CardContent className="p-4 break-words sm:p-5">{children}</CardContent>
    </Card>
  );
}

export function DocsCallout({ className, children }: React.ComponentProps<"div">) {
  return (
    <Alert
      className={cn(
        "my-6 rounded-[0.85rem] border-secondary/30 bg-secondary/6 px-5 py-4 text-sm leading-[1.65] text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]",
        className,
      )}
    >
      <AlertTitle className="sr-only">Note</AlertTitle>
      <AlertDescription className="[&_strong]:text-secondary text-sm leading-[1.65] text-[color-mix(in_srgb,var(--foreground)_82%,transparent)] [&_p:not(:last-child)]:mb-0">
        {children}
      </AlertDescription>
    </Alert>
  );
}

export function DocsNavCard({
  href,
  label,
  title,
  align = "left",
  icon,
}: {
  href: Route;
  label: React.ReactNode;
  title: string;
  align?: "left" | "right";
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-1 rounded-[0.85rem] border border-primary/18 bg-[#090c1280] p-4 no-underline transition-[border-color,background] duration-200 hover:border-primary/40 hover:bg-[#0c101899]",
        align === "right" && "text-right sm:col-start-2",
      )}
    >
      <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.16em] uppercase">
        {label}
      </span>
      <span className="font-display text-foreground text-[0.95rem] font-semibold">
        {align === "right" ? (
          <>
            {title} {icon}
          </>
        ) : (
          <>
            {icon} {title}
          </>
        )}
      </span>
    </Link>
  );
}
