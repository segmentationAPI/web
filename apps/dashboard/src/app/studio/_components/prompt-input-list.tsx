"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PromptInputListProps = {
  mode: "image" | "video" | "none";
  boxCount: number;
  minPrompts?: number;
  disabled?: boolean;
  onStateChange?: (state: PromptInputState) => void;
};

type PromptInputState = {
  cleanPrompts: string[];
};

type PromptRow = {
  id: string;
  value: string;
};

function trimPrompts(prompts: string[]) {
  return prompts.map((prompt) => prompt.trim()).filter(Boolean);
}

export function PromptInputList({
  mode,
  boxCount,
  minPrompts = 1,
  disabled = false,
  onStateChange,
}: PromptInputListProps) {
  const nextPromptId = useRef(0);

  const createRow = useCallback((): PromptRow => {
    const next = nextPromptId.current;
    nextPromptId.current += 1;
    return { id: `prompt-${next}`, value: "" };
  }, []);

  const [rows, setRows] = useState<PromptRow[]>(() =>
    Array.from({ length: minPrompts }, () => createRow()),
  );

  const emitPromptState = useCallback((nextRows: PromptRow[]) => {
    const prompts = nextRows.map((row) => row.value);
    onStateChange?.({
      cleanPrompts: trimPrompts(prompts),
    });
  }, [onStateChange]);

  const cleanPrompts = useMemo(
    () => trimPrompts(rows.map((row) => row.value)),
    [rows],
  );
  const hasRequiredPrompt = cleanPrompts.length > 0;
  const requiresPromptBoxParity = boxCount > 0;
  const hasPromptBoxParity = !requiresPromptBoxParity || cleanPrompts.length === boxCount;
  const errorMessage = !hasRequiredPrompt
    ? "Add at least one prompt to run segmentation."
    : !hasPromptBoxParity
      ? `Prompt count must match box count (${cleanPrompts.length}/${boxCount}).`
      : null;

  const replacePrompt = useCallback((index: number, nextValue: string) => {
    setRows((current) => {
      const nextRows = current.map((row, currentIndex) =>
        currentIndex === index ? { ...row, value: nextValue } : row,
      );
      emitPromptState(nextRows);
      return nextRows;
    });
  }, [emitPromptState]);

  const addPrompt = useCallback(() => {
    setRows((current) => {
      const nextRows = [...current, createRow()];
      emitPromptState(nextRows);
      return nextRows;
    });
  }, [createRow, emitPromptState]);

  const removePrompt = useCallback((index: number) => {
    setRows((current) => {
      if (current.length <= minPrompts) {
        return current;
      }

      const nextRows = current.filter((_, currentIndex) => currentIndex !== index);
      emitPromptState(nextRows);
      return nextRows;
    });
  }, [emitPromptState, minPrompts]);

  const promptPlaceholder = mode === "video"
    ? "describe object(s) to segment"
    : "object to segment";

  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Prompts {boxCount > 0 ? "(Required: one per box)" : "(Required)"}
      </Label>
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <Input
            value={row.value}
            onChange={(event) => replacePrompt(index, event.target.value)}
            placeholder={promptPlaceholder}
            disabled={disabled}
            className="h-9 w-full rounded-lg border-input bg-background/65 text-xs"
          />
          <Button
            type="button"
            onClick={() => removePrompt(index)}
            disabled={disabled || rows.length <= minPrompts}
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
