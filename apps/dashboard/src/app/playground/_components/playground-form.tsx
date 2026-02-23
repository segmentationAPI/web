"use client";

import { Loader2, Plus, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { RunButtonState } from "./playground-types";

type PlaygroundFormProps = {
  onFileSelected: (file: File | null) => void;
  onPromptsChange: (value: string[]) => void;
  onRunRequested: () => void;
  prompts: string[];
  runButtonState: RunButtonState;
  statusMessage: string | null;
};

export function PlaygroundForm({
  onFileSelected,
  onPromptsChange,
  onRunRequested,
  prompts,
  runButtonState,
  statusMessage,
}: PlaygroundFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onRunRequested();
      }}
      className="space-y-3 rounded-xl border border-border/70 bg-muted/45 p-3"
    >
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
          Prompts
        </label>
        <div className="flex flex-col gap-2">
          {prompts.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={p}
                onChange={(event) => {
                  const next = [...prompts];
                  next[i] = event.target.value;
                  onPromptsChange(next);
                }}
                placeholder="object to segment (e.g. red shoe, foreground person, tree)"
                className="w-full border border-input bg-background/65 px-2.5 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              />
              {prompts.length > 1 && (
                <button
                  type="button"
                  onClick={() => onPromptsChange(prompts.filter((_, j) => j !== i))}
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onPromptsChange([...prompts, ""])}
            className="flex items-center gap-1.5 self-start font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="size-3" />
            Add Prompt
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="playground-image"
          className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
        >
          Image
        </label>
        <Input
          id="playground-image"
          type="file"
          accept="image/*"
          onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
          className="h-10 cursor-pointer border-input bg-background/65 file:mr-2 file:rounded-sm file:border file:border-input file:bg-muted/60 file:px-2.5"
        />
        {statusMessage ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
            {statusMessage}
          </p>
        ) : null}
        <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
          Threshold and maskThreshold are fixed to 0.5 for this playground.
        </p>
      </div>

      <Button
        type="submit"
        disabled={runButtonState === "running"}
        className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
      >
        {runButtonState === "running" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Running
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" aria-hidden />
            Run Segmentation
          </>
        )}
      </Button>
    </form>
  );
}
