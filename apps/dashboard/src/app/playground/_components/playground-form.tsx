"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { RunButtonState } from "./playground-types";

type PlaygroundFormProps = {
  apiKey: string;
  batchMode: boolean;
  selectedFileCount: number;
  onApiKeyChange: (value: string) => void;
  onBatchModeChange: (value: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  onPromptChange: (value: string) => void;
  onRunRequested: () => void;
  prompt: string;
  runButtonState: RunButtonState;
  statusMessage: string | null;
};

export function PlaygroundForm({
  apiKey,
  batchMode,
  selectedFileCount,
  onApiKeyChange,
  onBatchModeChange,
  onFilesSelected,
  onPromptChange,
  onRunRequested,
  prompt,
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
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-2.5 py-2">
          <label
            htmlFor="playground-batch-mode"
            className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
          >
            Batch Mode
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              id="playground-batch-mode"
              type="checkbox"
              checked={batchMode}
              onChange={(event) => onBatchModeChange(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
              {batchMode ? "On" : "Off"}
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="playground-image"
          className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
        >
          {batchMode ? "Images" : "Image"}
        </label>
        <Input
          id="playground-image"
          type="file"
          accept="image/*"
          multiple={batchMode}
          onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
          className="h-10 cursor-pointer border-input bg-background/65 file:mr-2 file:rounded-sm file:border file:border-input file:bg-muted/60 file:px-2.5"
        />
        {statusMessage ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
            {statusMessage}
          </p>
        ) : null}
        <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
          {batchMode
            ? `${selectedFileCount} image${selectedFileCount === 1 ? "" : "s"} selected.`
            : "Threshold and maskThreshold are fixed to 0.5 for this playground."}
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
            {batchMode ? "Running Batch" : "Running"}
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" aria-hidden />
            {batchMode ? "Run Batch Segmentation" : "Run Segmentation"}
          </>
        )}
      </Button>
    </form>
  );
}
