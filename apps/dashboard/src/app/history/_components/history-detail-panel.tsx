"use client";

import type { ImageOutputManifest, OutputManifest, VideoOutputManifest } from "@segmentationapi/sdk";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileJson,
  Layers3,
  LoaderCircle,
  ScanSearch,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getOutputManifest } from "@/app/studio/actions";
import { formatDate, formatNumber } from "@/components/dashboard-format";
import { SectionLabel, ToneBadge, type StatusTone } from "@/components/studio/studio-status-primitives";
import MediaPreview from "@/components/studio/media-preview";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobListItem } from "@/lib/dashboard-types";

import { normalizeHistoryListQuery } from "./history-query";
import { buildHistoryHref } from "./history-shared";

function statusTone(status: JobListItem["status"]): StatusTone {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warning";
  return "neutral";
}

function formatDecimal(value: number | null | undefined) {
  if (value == null) {
    return "--";
  }

  return value.toFixed(3);
}

function ItemPreview({
  kind,
  previewUrl,
  emptyMessage,
}: {
  kind: "image" | "video";
  previewUrl: string | null | undefined;
  emptyMessage: string;
}) {
  if (!previewUrl) {
    return (
      <div className="rounded-[1.15rem] border border-dashed border-border/60 bg-background/55 px-4 py-8 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return <MediaPreview assetUrl={previewUrl} mediaType={kind} className="h-64 sm:h-80 lg:h-96" />;
}


function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-border/60 bg-background/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-lg tracking-[0.02em] text-foreground">{value}</p>
    </div>
  );
}

function KeyValueGrid({
  entries,
}: {
  entries: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map((entry) => (
        <div key={entry.label} className="rounded-[1rem] border border-border/60 bg-background/45 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {entry.label}
          </p>
          <p className="mt-2 break-all text-sm text-foreground">{entry.value}</p>
        </div>
      ))}
    </div>
  );
}

function ManifestOverview({
  selectedJob,
  manifest,
}: {
  selectedJob: JobListItem;
  manifest: OutputManifest;
}) {
  const previewCount = manifest.items.filter((item) => Boolean(item.previewUrl)).length;
  const totalUnits = manifest.items.reduce((sum, item) => sum + item.units, 0);
  const totalMasks =
    manifest.type === "image"
      ? manifest.items.reduce((sum, item) => sum + item.masks.length, 0)
      : manifest.items.reduce(
          (sum, item) => sum + Object.values(item.counts ?? {}).reduce((acc, value) => acc + value, 0),
          0,
        );

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Status" value={selectedJob.status} />
        <MetricCard label="Items" value={formatNumber(manifest.items.length)} />
        <MetricCard label="Preview Assets" value={formatNumber(previewCount)} />
        <MetricCard label="Units" value={formatNumber(totalUnits)} />
      </div>

      <Card className="rounded-[1.35rem] border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <SectionLabel>Manifest Overview</SectionLabel>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid
            entries={[
              { label: "Job ID", value: manifest.jobId },
              { label: "Account ID", value: manifest.accountId },
              { label: "Type", value: manifest.type },
              { label: "Detected Outputs", value: formatNumber(totalMasks) },
              { label: "Created At", value: formatDate(selectedJob.createdAt) },
              { label: "Updated At", value: formatDate(selectedJob.updatedAt) },
            ]}
          />

          <div className="rounded-[1rem] border border-border/60 bg-background/45 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {manifest.prompts.length > 0 ? (
                manifest.prompts.map((prompt) => (
                  <span
                    key={prompt}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground"
                  >
                    {prompt}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No prompts recorded in the manifest.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function OutputsSection({ manifest }: { manifest: OutputManifest }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(0, true);
    setCurrent(0);
  }, [api, manifest.jobId]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (manifest.items.length === 0) {
    return (
      <Card className="rounded-[1.35rem] border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <SectionLabel>Generated Outputs</SectionLabel>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1rem] border border-dashed border-border/60 bg-background/45 px-4 py-8 text-center text-xs text-muted-foreground">
            No output items were recorded in this manifest.
          </div>
        </CardContent>
      </Card>
    );
  }

  const label = manifest.type === "image" ? "Image" : "Clip";

  return (
    <Card className="overflow-hidden rounded-[1.35rem] border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {manifest.type === "video" ? (
              <Video className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <Layers3 className="size-4 text-muted-foreground" aria-hidden />
            )}
            <SectionLabel>Generated Outputs</SectionLabel>
          </div>
          {manifest.items.length > 1 && (
            <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
              {label} {current + 1} of {manifest.items.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Carousel setApi={setApi} opts={{ loop: manifest.items.length > 1 }}>
          <div className="relative">
            {manifest.items.length > 1 && (
              <>
                <CarouselPrevious className="absolute -left-1 top-1/2 z-10 -translate-y-1/2" />
                <CarouselNext className="absolute -right-1 top-1/2 z-10 -translate-y-1/2" />
              </>
            )}
            <CarouselContent>
              {manifest.items.map((item) => (
                <CarouselItem key={item.taskId}>
                  {manifest.type === "image" ? (
                    <ImageItemDetail item={item as ImageOutputManifest["items"][number]} />
                  ) : (
                    <VideoItemDetail item={item as VideoOutputManifest["items"][number]} />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>
        </Carousel>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="truncate text-right text-xs text-foreground">{value}</span>
    </div>
  );
}

function ImageItemDetail({ item }: { item: ImageOutputManifest["items"][number] }) {
  return (
    <div className="space-y-3">
      <ItemPreview kind="image" previewUrl={item.previewUrl} emptyMessage="No preview image generated." />

      <div className="divide-y divide-border/30 rounded-[1rem] border border-border/60 bg-background/40 px-3 sm:columns-2 sm:gap-x-6">
        <DetailRow label="Input ID" value={item.inputId} />
        <DetailRow label="Task ID" value={item.taskId} />
        <DetailRow label="Generated" value={formatDate(item.generatedAt)} />
        <DetailRow label="Units" value={formatNumber(item.units)} />
      </div>

      {item.masks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.masks.map((mask) => (
            <a
              key={mask.url}
              href={mask.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <span className="font-mono text-foreground">#{mask.maskIndex}</span>
              <span className="text-muted-foreground/70">
                {formatDecimal(mask.score)} / {formatDecimal(mask.confidence)}
              </span>
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoItemDetail({ item }: { item: VideoOutputManifest["items"][number] }) {
  const counts = item.counts && Object.keys(item.counts).length > 0 ? item.counts : null;

  return (
    <div className="space-y-3">
      <ItemPreview kind="video" previewUrl={item.previewUrl} emptyMessage="No preview video generated." />

      <div className="divide-y divide-border/30 rounded-[1rem] border border-border/60 bg-background/40 px-3 sm:columns-2 sm:gap-x-6">
        <DetailRow label="Input ID" value={item.inputId} />
        <DetailRow label="Task ID" value={item.taskId} />
        <DetailRow label="Generated" value={formatDate(item.generatedAt)} />
        <DetailRow label="Units" value={formatNumber(item.units)} />
        <DetailRow label="FPS" value={formatNumber(item.fps ?? null)} />
        <DetailRow label="Frames" value={formatNumber(item.numFrames ?? null)} />
        <DetailRow label="Max Frames" value={formatNumber(item.maxFrames ?? null)} />
        <DetailRow label="Threshold" value={formatDecimal(item.scoreThreshold)} />
        {counts &&
          Object.entries(counts).map(([label, value]) => (
            <DetailRow key={label} label={label} value={formatNumber(value)} />
          ))}
      </div>

      <a
        href={item.masks}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <FileJson className="size-3" aria-hidden />
        Mask manifest
        <ExternalLink className="size-3" aria-hidden />
      </a>
    </div>
  );
}

function RawManifestSection({ manifest }: { manifest: OutputManifest }) {
  return (
    <Card className="rounded-[1.35rem] border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileJson className="size-4 text-muted-foreground" aria-hidden />
          <SectionLabel>Raw Manifest</SectionLabel>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[32rem] overflow-auto rounded-[1rem] border border-border/60 bg-black/30 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-card/70">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <div>
          <p className="font-display text-lg text-foreground">Loading output manifest</p>
          <p className="mt-1 text-sm text-muted-foreground">Pulling generated assets and item-level metadata.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ManifestUnavailableState({ selectedJob }: { selectedJob: JobListItem }) {
  const body =
    selectedJob.status === "failed"
      ? "This job did not finish successfully, so no output manifest is available."
      : selectedJob.status === "success"
        ? "The job completed, but the output manifest could not be loaded."
        : "This job is still running. The output manifest will appear after processing finishes.";

  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-card/70">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full border border-border/60 bg-background/55 p-3">
          {selectedJob.status === "failed" ? (
            <AlertTriangle className="size-5 text-rose-300" aria-hidden />
          ) : (
            <ScanSearch className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="max-w-xl">
          <p className="font-display text-lg text-foreground">Manifest not available</p>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type HistoryDetailPanelProps = {
  selectedJob: JobListItem;
};

export function HistoryDetailPanel({ selectedJob }: HistoryDetailPanelProps) {
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<OutputManifest | null>(null);
  const [isLoading, setIsLoading] = useState(selectedJob.status === "success");
  const [hasManifestError, setHasManifestError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      if (selectedJob.status !== "success") {
        setManifest(null);
        setIsLoading(false);
        setHasManifestError(false);
        return;
      }

      setIsLoading(true);
      setHasManifestError(false);

      try {
        const nextManifest = await getOutputManifest(selectedJob.id);

        if (!cancelled) {
          setManifest(nextManifest);
        }
      } catch {
        if (!cancelled) {
          setManifest(null);
          setHasManifestError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, [selectedJob.id, selectedJob.status]);

  const backHref = useMemo(() => {
    return buildHistoryHref(
      normalizeHistoryListQuery({
        page: searchParams.get("page") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        mode: searchParams.get("mode") ?? undefined,
      }),
    );
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <Card className="glass-panel overflow-hidden rounded-[1.7rem] border-border/70 bg-card/80 p-0">
        <CardHeader className="relative overflow-hidden border-b border-border/60 bg-card/95 px-4 py-4 sm:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={backHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "rounded-full font-mono uppercase tracking-[0.12em]",
                })}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Back
              </Link>
              <ToneBadge tone={statusTone(selectedJob.status)}>{selectedJob.status}</ToneBadge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)] lg:items-end">
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Output Manifest Explorer
                </p>
                <p className="break-all font-display text-xl tracking-[0.02em] text-foreground sm:text-2xl">
                  {selectedJob.id}
                </p>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Manifest-first history view with item-level previews, generated assets, and raw metadata.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <MetricCard label="Mode" value={selectedJob.processingMode} />
                <MetricCard label="Created" value={formatDate(selectedJob.createdAt)} />
                <MetricCard label="Updated" value={formatDate(selectedJob.updatedAt)} />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? <LoadingState /> : null}

      {!isLoading && manifest ? (
        <>
          <div className="hidden space-y-4 md:block">
            <ManifestOverview selectedJob={selectedJob} manifest={manifest} />
            <OutputsSection manifest={manifest} />
            <RawManifestSection manifest={manifest} />
          </div>

          <div className="md:hidden">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted/60 p-1">
                <TabsTrigger value="overview" className="rounded-full">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="outputs" className="rounded-full">
                  Outputs
                </TabsTrigger>
                <TabsTrigger value="raw" className="rounded-full">
                  Raw
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-3">
                <ManifestOverview selectedJob={selectedJob} manifest={manifest} />
              </TabsContent>
              <TabsContent value="outputs" className="mt-3">
                <OutputsSection manifest={manifest} />
              </TabsContent>
              <TabsContent value="raw" className="mt-3">
                <RawManifestSection manifest={manifest} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : null}

      {!isLoading && !manifest ? <ManifestUnavailableState selectedJob={selectedJob} /> : null}

      {!isLoading && hasManifestError ? (
        <p className="px-1 text-xs text-muted-foreground">
          The manifest fetch failed for this job. If the job completed recently, the asset may not be available yet.
        </p>
      ) : null}
    </div>
  );
}
