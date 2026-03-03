import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { MaskArtifactResult } from "@segmentationapi/sdk";
import NextImage from "next/image";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { BoxCoordinates } from "../studio-canvas-types";
import { ImageCanvas } from "../image-canvas";
import { SectionLabel } from "./studio-ui-primitives";
import { useStudioPreviewViewModel } from "./use-studio-view-model";

function EmptyPreview() {
  return (
    <Empty className="flex-1 rounded-lg border border-dashed border-border/40 bg-muted/8">
      <EmptyHeader>
        <EmptyMedia>
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted/30">
            <Sparkles className="size-6 text-primary/60" />
          </div>
        </EmptyMedia>
        <EmptyTitle className="text-foreground/80">No preview yet</EmptyTitle>
        <EmptyDescription>Upload media and add prompts to get started.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type SingleImagePreviewProps = {
  firstImagePreviewUrl: string;
  hasOutputs: boolean;
  boxes: BoxCoordinates[];
  singleImageMasks: MaskArtifactResult[] | null;
  onBoxAdded: (box: BoxCoordinates) => void;
};

function SingleImagePreview({
  firstImagePreviewUrl,
  hasOutputs,
  boxes,
  singleImageMasks,
  onBoxAdded,
}: SingleImagePreviewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ImageCanvas
        src={firstImagePreviewUrl}
        alt="Selected image"
        readOnly={hasOutputs}
        boxes={hasOutputs ? [] : boxes}
        masks={singleImageMasks ?? undefined}
        onBoxAdded={onBoxAdded}
      />
    </div>
  );
}

type BatchImagePreviewProps = {
  imagePreviewUrls: string[];
  imageFileCount: number;
  carouselIndex: number;
  batchImageUrl: string | null;
  activeBatchStatus: string | null;
  activeBatchMasks: MaskArtifactResult[];
  onSetBatchCarouselIndex: (index: number) => void;
};

function BatchImagePreview({
  imagePreviewUrls,
  imageFileCount,
  carouselIndex,
  batchImageUrl,
  activeBatchStatus,
  activeBatchMasks,
  onSetBatchCarouselIndex,
}: BatchImagePreviewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {imagePreviewUrls.map((url, index) => {
          const isSelected = carouselIndex === index;

          return (
            <button
              key={`thumb-${index}`}
              type="button"
              onClick={() => onSetBatchCarouselIndex(index)}
              aria-label={`Select preview ${index + 1}`}
              aria-pressed={isSelected}
              aria-current={isSelected ? "true" : undefined}
              className={`shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
                isSelected
                  ? "border-secondary/70 shadow-[0_0_8px_rgba(57,213,201,0.2)]"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              <NextImage
                src={url}
                alt={`Input ${index + 1}`}
                width={64}
                height={48}
                unoptimized
                className="h-12 w-16 object-cover"
              />
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border/40 bg-background/30">
        {batchImageUrl ? (
          <NextImage
            src={batchImageUrl}
            alt={`Batch item ${carouselIndex + 1}`}
            fill
            unoptimized
            sizes="(max-width: 1280px) 70vw, 900px"
            className="object-contain"
          />
        ) : (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            Preview unavailable
          </div>
        )}

        {activeBatchMasks.map((mask, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- overlay masks need raw stacking + blend behavior.
          <img
            key={`${mask.key}-${index}`}
            src={mask.url}
            alt={`Batch mask ${index + 1}`}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-screen opacity-65"
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onSetBatchCarouselIndex(Math.max(0, carouselIndex - 1))}
          disabled={carouselIndex <= 0}
          aria-label="Previous batch image"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {carouselIndex + 1} / {Math.max(imageFileCount, 1)}
          {activeBatchStatus ? ` · ${activeBatchStatus}` : ""}
        </p>

        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() =>
            onSetBatchCarouselIndex(Math.min(imageFileCount - 1, carouselIndex + 1))
          }
          disabled={carouselIndex >= imageFileCount - 1}
          aria-label="Next batch image"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

type VideoPreviewProps = {
  isRunning: boolean;
  activeVideoBakedUrl: string | null;
};

function VideoPreview({
  isRunning,
  activeVideoBakedUrl,
}: VideoPreviewProps) {
  if (activeVideoBakedUrl) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-border/40 bg-background/30">
          <video src={activeVideoBakedUrl} controls className="max-h-full w-full object-contain" />
        </div>
        <p className="text-xs text-muted-foreground">
          Backend-baked video playback.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-border/40 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
      {isRunning
        ? "Generating baked video on the backend..."
        : "Baked video is unavailable for this job."}
    </div>
  );
}

export function PreviewPanel() {
  const {
    boxes,
    imageFiles,
    imagePreviewUrls,
    videoPreviewUrl,
    hasOutputs,
    viewMode,
    carouselIndex,
    activeBatchItem,
    activeBatchMasks,
    batchImageUrl,
    activeVideoBakedUrl,
    singleImageMasks,
    firstImagePreviewUrl,
    isRunning,
    onBoxAdded,
    onClearBoxes,
    onSetBatchCarouselIndex,
  } = useStudioPreviewViewModel();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Preview & Output</SectionLabel>

        {viewMode === "single-image" ? (
          <div className="flex items-center gap-2">
            {singleImageMasks ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-secondary">
                {singleImageMasks.length} masks
              </span>
            ) : boxes.length > 0 ? (
              <>
                <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                  {boxes.length} boxes
                </span>
                {!hasOutputs ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={onClearBoxes}
                    className="text-muted-foreground"
                  >
                    Clear
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {viewMode === "empty" ? <EmptyPreview /> : null}

        {viewMode === "single-image" && firstImagePreviewUrl ? (
          <SingleImagePreview
            firstImagePreviewUrl={firstImagePreviewUrl}
            hasOutputs={hasOutputs}
            boxes={boxes}
            singleImageMasks={singleImageMasks}
            onBoxAdded={onBoxAdded}
          />
        ) : null}

        {viewMode === "batch-image" ? (
          <BatchImagePreview
            imagePreviewUrls={imagePreviewUrls}
            imageFileCount={imageFiles.length}
            carouselIndex={carouselIndex}
            batchImageUrl={batchImageUrl}
            activeBatchStatus={activeBatchItem?.status ?? null}
            activeBatchMasks={activeBatchMasks}
            onSetBatchCarouselIndex={onSetBatchCarouselIndex}
          />
        ) : null}

        {viewMode === "video" && videoPreviewUrl ? (
          <VideoPreview
            isRunning={isRunning}
            activeVideoBakedUrl={activeVideoBakedUrl}
          />
        ) : null}
      </div>
    </div>
  );
}
