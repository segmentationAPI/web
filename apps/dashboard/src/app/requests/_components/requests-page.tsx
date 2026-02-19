"use client";

import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type { Route } from "next";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatDate, StatusPill } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobDetail, JobListItem } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import Image from "next/image";

const MASK_OVERLAY_COLORS = ["#ff5f57", "#2cf4ff", "#ffd166", "#8bff6a", "#4d96ff", "#ff8fab"];

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

type RequestsPageContentProps = {
  jobs: JobListItem[];
  selectedJob: JobDetail | null;
  selectedJobId: string | null;
};

export function RequestsPageContent({
  jobs,
  selectedJob,
  selectedJobId,
}: RequestsPageContentProps) {
  const router = useRouter();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [refreshing, startRefreshing] = useTransition();
  const [navigating, startNavigating] = useTransition();

  useEffect(() => {
    setPendingJobId(null);
  }, [selectedJobId]);

  function refreshJobs() {
    startRefreshing(() => {
      router.refresh();
    });
  }

  function openJobDetail(jobId: string) {
    setPendingJobId(jobId);
    startNavigating(() => {
      router.push(`/requests?jobId=${encodeURIComponent(jobId)}` as Route);
    });
  }

  function closeJobDetail() {
    setPendingJobId(null);
    startNavigating(() => {
      router.push("/requests" as Route);
    });
  }

  const activeJobId = pendingJobId ?? selectedJobId;
  const showDrawer = activeJobId !== null;
  const jobLoading = pendingJobId !== null || navigating;

  return (
    <>
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
              Request History
            </CardDescription>
            <CardTitle className="font-display tracking-[0.08em] text-[#e8f7ff]">
              Past API Requests
            </CardTitle>
          </div>
          <Button
            variant="outline"
            onClick={refreshJobs}
            disabled={refreshing}
            className="border-[#2cf4ff]/25 bg-[#2cf4ff]/10 font-mono uppercase tracking-[0.12em] text-[#9bf7ff] hover:bg-[#2cf4ff]/20"
          >
            <RefreshCw className={cn("size-3.5", refreshing ? "animate-spin" : "")} aria-hidden />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-[#2cf4ff]/20">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#08101d] font-mono uppercase tracking-[0.12em] text-[#90a3ba]">
                <tr>
                  <th className="px-3 py-2">Request ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">API key</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center font-mono text-xs text-[#7d90aa]"
                    >
                      No API requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-[#2cf4ff]/15">
                      <td className="max-w-[240px] truncate px-3 py-2 font-mono text-[#d6e9ff]">
                        {job.requestId}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={job.status} />
                      </td>
                      <td className="px-3 py-2 font-mono text-[#9ab7d5]">
                        {job.apiKeyPrefix || "--"}
                      </td>
                      <td className="px-3 py-2 text-[#9ab7d5]">{formatDate(job.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          onClick={() => openJobDetail(job.id)}
                          disabled={navigating && pendingJobId === job.id}
                          className="font-mono uppercase tracking-[0.12em] text-[#9bf7ff] hover:bg-[#2cf4ff]/10"
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showDrawer ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="flex-1 bg-[#01050b]/80"
            onClick={closeJobDetail}
            aria-label="Close request details"
          />
          <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#2cf4ff]/25 bg-[#050910] p-5">
            {jobLoading ? (
              <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-[#7d90aa]">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Loading Request Detail
              </div>
            ) : !selectedJob ? (
              <div className="border border-[#ff5470]/25 bg-[#ff5470]/7 p-3 text-xs text-[#ffbdc7]">
                Unable to load this request detail.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">
                      Request Detail
                    </p>
                    <h2 className="mt-1 break-all font-display text-lg tracking-[0.06em] text-[#e8f7ff]">
                      {selectedJob.requestId}
                    </h2>
                  </div>
                  <StatusPill status={selectedJob.status} />
                </div>

                <div className="grid gap-2 border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#bdd2ec] sm:grid-cols-2">
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">
                      Created At
                    </span>
                    <p className="mt-1">{formatDate(selectedJob.createdAt)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">
                      Prompt
                    </span>
                    <p className="mt-1 wrap-break-word">{selectedJob.prompt || "--"}</p>
                  </div>
                </div>

                {selectedJob.errorMessage ? (
                  <div className="border border-[#ff5470]/25 bg-[#ff5470]/7 p-3 text-xs text-[#ffbdc7]">
                    <p className="font-mono uppercase tracking-[0.14em] text-[#ff95a9]">
                      Error Message
                    </p>
                    <p className="mt-1">{selectedJob.errorMessage}</p>
                  </div>
                ) : null}

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">
                    Input + Combined Masks
                  </h3>
                  {selectedJob.outputs.length === 0 ? (
                    <div className="border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#7d90aa]">
                      No output images
                    </div>
                  ) : !selectedJob.inputImageUrl ? (
                    <div className="border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#7d90aa]">
                      Missing input image for overlay rendering
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden border border-[#2cf4ff]/20 bg-[#02060d]">
                        <Image
                          src={selectedJob.inputImageUrl}
                          alt="Input image with combined mask overlays"
                          className="block w-full object-cover"
                          width={500}
                          height={500}
                        />
                        {selectedJob.outputs.map((output, index) =>
                          output.url ? (
                            <div
                              key={`overlay-${output.outputIndex}`}
                              className="pointer-events-none absolute inset-0"
                              style={buildMaskTintStyle(
                                output.url,
                                MASK_OVERLAY_COLORS[index % MASK_OVERLAY_COLORS.length],
                              )}
                            />
                          ) : null,
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default function RequestsPage(props: RequestsPageContentProps) {
  return (
    <main className="mx-auto flex w-full max-w-330 flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <RequestsPageContent {...props} />
    </main>
  );
}
