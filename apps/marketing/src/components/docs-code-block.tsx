"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function DocsCodeBlock({
  code,
  label,
  className = "",
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyStatus("Code copied to clipboard.");

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        setCopyStatus(null);
      }, 2000);
    } catch {
      setCopyStatus("Clipboard copy failed.");
    }
  };

  return (
    <div className={className}>
      {label && (
        <p className="text-muted-foreground mt-1 mb-2 inline-flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.14em] uppercase">
          {label}
        </p>
      )}
      <div
        className={cn(
          "group relative my-4 overflow-x-auto rounded-xl border border-primary/18 bg-[rgba(6,8,13,0.9)] px-[0.9rem] py-[0.85rem] font-mono text-[0.72rem] leading-[1.7] text-[#f2c5a0] sm:rounded-2xl sm:px-5 sm:py-[1.15rem] sm:text-[0.78rem]",
        )}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="border-border/30 bg-background/60 text-muted-foreground hover:text-foreground absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-md border opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <pre className="m-0">
          <code className="whitespace-pre">{code}</code>
        </pre>
        <span aria-live="polite" className="sr-only">
          {copyStatus}
        </span>
      </div>
    </div>
  );
}
