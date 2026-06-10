import type { ComponentProps, ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

function BlogLink({ href, children, ...props }: ComponentProps<"a">) {
  const className = cn(
    "text-primary underline underline-offset-4 transition-colors hover:text-secondary",
    props.className,
  );

  if (!href) {
    return (
      <a {...props} className={className}>
        {children}
      </a>
    );
  }

  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href as Route} {...props} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" {...props} className={className}>
      {children}
    </a>
  );
}

function BlogImage({ alt = "", className, src, title, width, height }: ComponentProps<"img">) {
  if (typeof src !== "string") {
    return null;
  }

  const numericWidth = Number(width);
  const numericHeight = Number(height);

  if (numericWidth > 0 && numericHeight > 0) {
    return (
      <Image
        src={src}
        alt={alt}
        width={numericWidth}
        height={numericHeight}
        title={title}
        className={cn("my-8 rounded-2xl border border-primary/20", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative my-8 block aspect-video overflow-hidden rounded-2xl border border-primary/20 bg-muted/20",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        title={title}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        className="object-contain"
      />
    </span>
  );
}

function Callout({ title = "Note", children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="border-secondary/30 bg-secondary/8 my-8 rounded-2xl border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-secondary font-mono text-[0.68rem] tracking-[0.16em] uppercase">{title}</p>
      <div className="mt-2 text-sm leading-[1.7] text-[color-mix(in_srgb,var(--foreground)_84%,transparent)] [&_p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ className, ...props }) => (
      <h1
        className={cn(
          "font-display mt-4 mb-6 text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-5xl",
          className,
        )}
        {...props}
      />
    ),
    h2: ({ className, ...props }) => (
      <h2
        className={cn(
          "font-display mt-12 mb-4 border-b border-primary/20 pb-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl",
          className,
        )}
        {...props}
      />
    ),
    h3: ({ className, ...props }) => (
      <h3 className={cn("font-display mt-9 mb-3 text-xl font-semibold", className)} {...props} />
    ),
    h4: ({ className, ...props }) => (
      <h4 className={cn("font-display mt-7 mb-2 text-lg font-semibold", className)} {...props} />
    ),
    p: ({ className, ...props }) => (
      <p className={cn("mb-5 leading-[1.8] text-muted-foreground", className)} {...props} />
    ),
    a: BlogLink,
    strong: ({ className, ...props }) => (
      <strong className={cn("font-semibold text-foreground", className)} {...props} />
    ),
    ul: ({ className, ...props }) => (
      <ul
        className={cn(
          "mb-6 space-y-2.5 pl-0 [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.72em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rotate-45 [&>li]:before:rounded-[1px] [&>li]:before:bg-primary/80",
          className,
        )}
        {...props}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        className={cn("mb-6 list-decimal space-y-2.5 pl-5 marker:text-primary", className)}
        {...props}
      />
    ),
    li: ({ className, ...props }) => (
      <li className={cn("leading-[1.75] text-muted-foreground", className)} {...props} />
    ),
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={cn(
          "my-8 border-l-2 border-primary/70 bg-primary/8 py-4 pr-5 pl-5 text-lg italic text-[color-mix(in_srgb,var(--foreground)_86%,transparent)] [&_p]:mb-0 [&_p]:text-current",
          className,
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }) => (
      <code
        className={cn(
          "rounded-md bg-secondary/10 px-1.5 py-0.5 font-mono text-[0.86em] text-secondary",
          className,
        )}
        {...props}
      />
    ),
    pre: ({ className, ...props }) => (
      <pre
        className={cn(
          "my-8 overflow-x-auto rounded-2xl border border-primary/20 bg-[#06080dcc] p-4 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&_code]:bg-transparent [&_code]:p-0",
          className,
        )}
        {...props}
      />
    ),
    table: ({ className, ...props }) => (
      <div className="border-primary/20 my-8 overflow-x-auto rounded-2xl border">
        <table className={cn("w-full border-collapse text-sm", className)} {...props} />
      </div>
    ),
    th: ({ className, ...props }) => (
      <th
        className={cn(
          "border-b border-primary/20 bg-primary/10 px-4 py-3 text-left font-mono text-[0.68rem] tracking-[0.12em] text-foreground uppercase",
          className,
        )}
        {...props}
      />
    ),
    td: ({ className, ...props }) => (
      <td
        className={cn("border-b border-border/45 px-4 py-3 text-muted-foreground", className)}
        {...props}
      />
    ),
    hr: ({ className, ...props }) => (
      <hr className={cn("my-10 border-primary/20", className)} {...props} />
    ),
    img: BlogImage,
    Image,
    Callout,
    ...components,
  };
}
