"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatDate } from "@/components/dashboard-format";
import {
  ErrorBanner,
  SectionLabel,
  ToneBadge,
  type StatusTone,
} from "@/components/studio/studio-status-primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobDetail } from "@/lib/dashboard-types";

import { buildHistoryHref, type HistoryListQuery } from "./history-query";

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

function statusTone(status: JobDetail["status"]): StatusTone {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "processing") return "warning";
  return "neutral";
}

function renderImageOverlayPreview(params: {
  inputImageUrl: string | null;
  outputs: JobDetail["outputs"];
  emptyMessage: string;
  missingInputMessage: string;
  overlayKeyPrefix: string;
}) {
  if (params.outputs.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
        {params.emptyMessage}
      </div>
    );
  }

  if (!params.inputImageUrl) {
    return (
      <div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
        {params.missingInputMessage}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/80">
      <Image
        src={params.inputImageUrl}
        alt="Input image with combined mask overlays"
        className="block w-full object-cover"
        width={700}
        height={700}
      />
      {params.outputs.map((output, index) =>
        output.url ? (
          <div
            key={`${params.overlayKeyPrefix}-${output.maskIndex}-${index}`}
            className="pointer-events-none absolute inset-0"
            style={buildMaskTintStyle(
              output.url,
              MASK_OVERLAY_COLORS[index % MASK_OVERLAY_COLORS.length],
            )}
          />
        ) : null,
      )}
    </div>
  );
}

function OverviewSection({ job }: { job: JobDetail }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <SectionLabel>Overview</SectionLabel>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Created At</p>
          <p className="mt-1">{formatDate(job.createdAt)}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Updated At</p>
          <p className="mt-1">{formatDate(job.updatedAt)}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Modality</p>
          <p className="mt-1">{job.modality}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Mode</p>
          <div className="mt-1">
            <ToneBadge tone={job.processingMode === "video" ? "warning" : job.processingMode === "batch" ? "success" : "neutral"}>
              {job.processingMode}
            </ToneBadge>
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Prompts</p>
          <p className="mt-1 wrap-break-words">{job.prompts.length > 0 ? job.prompts.join(", ") : "--"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RunConfigSection({ job }: { job: JobDetail }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <SectionLabel>Run Configuration</SectionLabel>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Boxes</p>
          <p className="mt-1">{job.requestConfig.boxes?.length ?? 0}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Points</p>
          <p className="mt-1">{job.requestConfig.points?.length ?? 0}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Threshold</p>
          <p className="mt-1">{job.requestConfig.threshold ?? "--"}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Mask Threshold</p>
          <p className="mt-1">{job.requestConfig.maskThreshold ?? "--"}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Frame Index</p>
          <p className="mt-1">{job.requestConfig.frameIdx ?? "--"}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">FPS</p>
          <p className="mt-1">{job.requestConfig.fps ?? "--"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Video Output Mode</p>
          <p className="mt-1">{job.requestConfig.videoOutputMode ?? "--"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OutputsSection({ job }: { job: JobDetail }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const groups = job.imageGroups;
  const activeGroup = groups[Math.min(activeIndex, Math.max(groups.length - 1, 0))] ?? null;

  if (job.modality === "video") {
    return (
      <Card className="rounded-2xl border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <SectionLabel>Outputs</SectionLabel>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {job.inputVideoUrl ? (
            <video
              src={job.inputVideoUrl}
              controls
              className="w-full overflow-hidden rounded-2xl border border-border/70 bg-background/80"
            />
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-muted-foreground">
              Missing input video preview.
            </div>
          )}
          {job.videoOutput ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Frames Processed</p>
                  <p className="mt-1">{job.videoOutput.framesProcessed}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Frames With Masks</p>
                  <p className="mt-1">{job.videoOutput.framesWithMasks}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Total Masks</p>
                  <p className="mt-1">{job.videoOutput.totalMasks}</p>
                </div>
              </div>
              <div>
                <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Mask Encoding</p>
                <p className="mt-1">{job.videoOutput.maskEncoding}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <a
                  href={job.videoOutput.manifestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  Manifest URL
                </a>
                <a
                  href={job.videoOutput.framesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  Frames URL
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-muted-foreground">
              No video output metadata available.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (job.processingMode === "batch") {
    return (
      <Card className="rounded-2xl border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <SectionLabel>Outputs</SectionLabel>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-muted-foreground">
              No batch images available.
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {groups.map((group, index) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                      index === activeIndex
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border/60 bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {activeGroup ? (
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/55 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-muted-foreground">{formatDate(activeGroup.createdAt)}</p>
                    <ToneBadge tone={statusTone(activeGroup.status)}>{activeGroup.status}</ToneBadge>
                  </div>
                  {renderImageOverlayPreview({
                    inputImageUrl: activeGroup.inputImageUrl,
                    outputs: activeGroup.outputs,
                    emptyMessage: "No output masks for this image.",
                    missingInputMessage: "Missing input image for overlay rendering.",
                    overlayKeyPrefix: activeGroup.id,
                  })}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <SectionLabel>Outputs</SectionLabel>
      </CardHeader>
      <CardContent>
        {renderImageOverlayPreview({
          inputImageUrl: job.inputImageUrl,
          outputs: job.outputs,
          emptyMessage: "No output masks available.",
          missingInputMessage: "Missing input image for overlay rendering.",
          overlayKeyPrefix: job.id,
        })}
      </CardContent>
    </Card>
  );
}

function MetadataSection({ job }: { job: JobDetail }) {
  const maskCount = useMemo(() => job.outputs.filter((output) => Boolean(output.url)).length, [job.outputs]);

  return (
    <Card className="rounded-2xl border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <SectionLabel>Metadata</SectionLabel>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Job ID</p>
          <p className="mt-1 break-all font-mono">{job.id}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">API Key Prefix</p>
          <p className="mt-1">{job.apiKeyPrefix ?? "--"}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Total Tasks</p>
          <p className="mt-1">{job.totalTasks}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Mask Artifacts</p>
          <p className="mt-1">{maskCount}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Error Code</p>
          <p className="mt-1">{job.errorCode ?? "--"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type HistoryDetailPanelProps = {
  selectedJob: JobDetail;
  historyQuery: HistoryListQuery;
};

export function HistoryDetailPanel({ selectedJob, historyQuery }: HistoryDetailPanelProps) {
  return (
    <Card className="glass-panel overflow-hidden rounded-[1.6rem] border-border/70 bg-card/75 p-0">
      <CardHeader className="sticky top-0 z-10 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={buildHistoryHref(historyQuery)}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "rounded-full font-mono uppercase tracking-[0.12em]",
            })}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="break-all font-display text-base tracking-[0.03em] text-foreground sm:text-lg">
            {selectedJob.id}
          </p>
          <ToneBadge tone={statusTone(selectedJob.status)}>{selectedJob.status}</ToneBadge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {selectedJob.errorMessage ? <ErrorBanner message={selectedJob.errorMessage} /> : null}

        <div className="hidden space-y-4 md:block">
          <OverviewSection job={selectedJob} />
          <RunConfigSection job={selectedJob} />
          <OutputsSection job={selectedJob} />
          <MetadataSection job={selectedJob} />
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
              <TabsTrigger value="metadata" className="rounded-full">
                Metadata
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-3 space-y-3">
              <OverviewSection job={selectedJob} />
              <RunConfigSection job={selectedJob} />
            </TabsContent>
            <TabsContent value="outputs" className="mt-3">
              <OutputsSection job={selectedJob} />
            </TabsContent>
            <TabsContent value="metadata" className="mt-3">
              <MetadataSection job={selectedJob} />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
