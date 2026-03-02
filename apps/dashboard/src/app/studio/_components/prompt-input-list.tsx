"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileKind } from "../_store/studio-selectors";

type PromptInputListProps = {
  mode: FileKind;
  boxCount: number;
  prompts: string[];
  onPromptsChange: (nextPrompts: string[]) => void;
  minPrompts?: number;
  disabled?: boolean;
};

function trimPrompts(prompts: string[]) {
  return prompts.map((prompt) => prompt.trim()).filter(Boolean);
}

export function PromptInputList({
  mode,
  boxCount,
  prompts,
  onPromptsChange,
  minPrompts = 1,
  disabled = false,
}: PromptInputListProps) {
  const cleanPrompts = useMemo(
    () => trimPrompts(prompts),
    [prompts],
  );
  const hasRequiredPrompt = cleanPrompts.length > 0;
  const requiresPromptBoxParity = boxCount > 0;
  const hasPromptBoxParity = !requiresPromptBoxParity || cleanPrompts.length === boxCount;
  const errorMessage = !hasRequiredPrompt
    ? "Add at least one prompt to run segmentation."
    : !hasPromptBoxParity
      ? `Prompt count must match box count (${cleanPrompts.length}/${boxCount}).`
      : null;

  function replacePrompt(index: number, nextValue: string) {
    onPromptsChange(prompts.map((prompt, promptIndex) => (promptIndex === index ? nextValue : prompt)));
  }

  function addPrompt() {
    onPromptsChange([...prompts, ""]);
  }

  function removePrompt(index: number) {
    if (prompts.length <= minPrompts) {
      return;
    }

    onPromptsChange(prompts.filter((_, promptIndex) => promptIndex !== index));
  }

  const promptPlaceholder = mode === FileKind.Video
    ? "describe object(s) to segment"
    : "object to segment";

  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Prompts {boxCount > 0 ? "(Required: one per box)" : "(Required)"}
      </Label>
      {prompts.map((prompt, index) => (
        <div key={`prompt-${index}`} className="flex items-center gap-2">
          <Input
            value={prompt}
            onChange={(event) => replacePrompt(index, event.target.value)}
            placeholder={promptPlaceholder}
            disabled={disabled}
            className="h-9 w-full rounded-lg border-input bg-background/65 text-xs"
          />
          <Button
            type="button"
            onClick={() => removePrompt(index)}
            disabled={disabled || prompts.length <= minPrompts}
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addPrompt}
        disabled={disabled}
        className="h-8 w-fit rounded-lg border-border/70 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        Add Prompt
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
