"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudioRunMode } from "../_store/studio-selectors";
import { useStudioStore } from "../_store/use-studio-store";

export function StudioApiKeyInput() {
  const [isVisible, setIsVisible] = useState(false);
  const apiKey = useStudioStore((state) => state.apiKey);
  const setApiKey = useStudioStore((state) => state.setApiKey);
  const runState = useStudioStore((state) => state.runState);
  const disabled = runState.mode === StudioRunMode.Running;

  useEffect(() => {
    if (apiKey.trim().length > 0) {
      setIsVisible(true);
    }
  }, [apiKey]);

  function hideAndClearApiKey() {
    setApiKey("");
    setIsVisible(false);
  }

  if (!isVisible) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        disabled={disabled}
        className="h-8 w-fit rounded-lg border-border/70 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        <Plus className="size-3.5" />
        Add API Key
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        API Key (Optional)
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste API key to use key-based endpoint"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-lg border-input bg-background/65 text-xs"
        />
        <DeleteIconButton
          onClick={hideAndClearApiKey}
          disabled={disabled}
          ariaLabel="Delete API key"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Leave blank to use your signed-in JWT session.
      </p>
    </div>
  );
}