"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileKind,
  StudioRunMode,
  selectFileKind,
} from "../_store/studio-selectors";
import { useStudioStore } from "../_store/use-studio-store";

function trimPrompts(prompts: string[]) {
  return prompts.map((prompt) => prompt.trim()).filter(Boolean);
}

export function PromptInputList() {
  const prompts = useStudioStore((state) => state.prompts);
  const boxes = useStudioStore((state) => state.boxes);
  const runState = useStudioStore((state) => state.runState);
  const setPrompts = useStudioStore((state) => state.setPrompts);

  const minPrompts = 1;
  const disabled = runState.mode === StudioRunMode.Running;
  const mode = selectFileKind({ files: useStudioStore((state) => state.files) });
  const boxCount = boxes.length;

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
    setPrompts(prompts.map((prompt, promptIndex) => (promptIndex === index ? nextValue : prompt)));
  }

  function addPrompt() {
    setPrompts([...prompts, ""]);
  }

  function removePrompt(index: number) {
    if (prompts.length <= minPrompts) {
      return;
    }

    setPrompts(prompts.filter((_, promptIndex) => promptIndex !== index));
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
          <DeleteIconButton
            onClick={() => removePrompt(index)}
            disabled={disabled || prompts.length <= minPrompts}
            ariaLabel={`Delete prompt ${index + 1}`}
          />
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
