"use client";

import { useEffect, useState } from "react";

import type { PlaygroundMaskPreview } from "./playground-types";

const MASK_OVERLAY_COLORS = ["#ff703f", "#39d5c9", "#f2b77a", "#74e8a5", "#f95f8e", "#ffeecc"];

function buildMaskTintStyle(maskUrl: string, color: string) {
  return {
    backgroundBlendMode: "multiply",
    backgroundImage: `linear-gradient(${color}, ${color}), url("${maskUrl}")`,
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundSize: "100% 100%, 100% 100%",
    mixBlendMode: "screen" as const,
    opacity: 0.7,
  };
}

type PlaygroundPreviewProps = {
  hasResult: boolean;
  masks: PlaygroundMaskPreview[];
  selectedFile: File | null;
};

export function PlaygroundPreview({ hasResult, masks, selectedFile }: PlaygroundPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/45 p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
        Input + Combined Masks
      </p>
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/75">
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Selected input with combined mask overlays"
              className="block w-full object-cover"
            />
            {masks.map((mask, index) =>
              mask.url ? (
                <div
                  key={`playground-overlay-${mask.url}-${index}`}
                  className="pointer-events-none absolute inset-0"
                  style={buildMaskTintStyle(mask.url, MASK_OVERLAY_COLORS[index % MASK_OVERLAY_COLORS.length])}
                />
              ) : null,
            )}
          </>
        ) : (
          <div className="grid min-h-52 place-items-center px-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Select an image to preview it here.
          </div>
        )}
      </div>
      {previewUrl && hasResult ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
          Combined from {masks.length} returned mask{masks.length === 1 ? "" : "es"}.
        </p>
      ) : null}
    </div>
  );
}
