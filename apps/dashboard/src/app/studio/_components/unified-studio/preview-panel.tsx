"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SectionLabel } from "@/components/studio/studio-status-primitives";
import { useInputType, useOutputLinks } from "../../_store/studio.store";
import MediaPreview from "@/components/studio/media-preview";
import { Button } from "@/components/ui/button";

function EmptyPreview() {
  return (
    <Empty className="border-border/40 bg-muted/8 flex-1 rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <div className="bg-muted/30 flex size-14 items-center justify-center rounded-xl">
            <Sparkles className="text-primary/60 size-6" />
          </div>
        </EmptyMedia>
        <EmptyTitle className="text-foreground/80">No preview yet</EmptyTitle>
        <EmptyDescription>Upload media and add prompts to get started.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function PreviewPanel() {
  const outputLinks = useOutputLinks();
  const inputType = useInputType();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasOutputs = outputLinks.length > 0;
  const hasMultipleOutputs = outputLinks.length > 1;

  useEffect(() => {
    if (selectedIndex >= outputLinks.length) {
      setSelectedIndex(0);
    }
  }, [outputLinks.length, selectedIndex]);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionLabel>Preview & Output</SectionLabel>
      </div>

      {!hasOutputs ? (
        <EmptyPreview />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="border-border/50 bg-muted/10 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border p-3 sm:p-4">
            <MediaPreview assetUrl={outputLinks[selectedIndex]} mediaType={inputType ?? "image"} />
          </div>

          {hasMultipleOutputs ? (
            <div className="border-border/50 bg-background/70 flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground text-xs">
                Output {selectedIndex + 1} of {outputLinks.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setSelectedIndex((selectedIndex - 1 + outputLinks.length) % outputLinks.length)
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedIndex((selectedIndex + 1) % outputLinks.length)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
