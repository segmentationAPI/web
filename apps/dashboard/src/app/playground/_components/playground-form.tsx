"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { RunButtonState } from "./playground-types";

type PlaygroundFormProps = {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onFileSelected: (file: File | null) => void;
  onPromptChange: (value: string) => void;
  onRunRequested: () => void;
  prompt: string;
  runButtonState: RunButtonState;
  showStatusMessage: boolean;
  statusMessage: string | null;
};

export function PlaygroundForm({
  apiKey,
  onApiKeyChange,
  onFileSelected,
  onPromptChange,
  onRunRequested,
  prompt,
  runButtonState,
  showStatusMessage,
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
        <label
          htmlFor="playground-api-key"
          className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
        >
          API Key
        </label>
        <Input
          id="playground-api-key"
          name="playground-api-key"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="sk_live_..."
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          className="h-9 border-input bg-background/65 font-mono [-webkit-text-security:disc]"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="playground-prompt"
          className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
        >
          Prompt
        </label>
        <textarea
          id="playground-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={4}
          placeholder="object to segment (e.g. red shoe, foreground person, tree)"
          className="min-h-24 w-full resize-y border border-input bg-background/65 px-2.5 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
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
        {showStatusMessage && statusMessage ? (
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
        ) : runButtonState === "queued" ? (
          <>
            <Sparkles className="size-3.5" aria-hidden />
            Queued
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

