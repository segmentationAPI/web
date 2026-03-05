"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";

import { formatDate } from "@/components/dashboard-format";
import { ToneBadge } from "@/components/studio/studio-status-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobListItem } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import {
  buildHistoryHref,
  type HistoryListQuery,
  type HistoryModeFilter,
  type HistoryStatusFilter,
} from "./history-query";

const STATUS_FILTERS: Array<{ value: HistoryStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const MODE_FILTERS: Array<{ value: HistoryModeFilter; label: string }> = [
  { value: "all", label: "All modes" },
  { value: "single", label: "Single" },
  { value: "batch", label: "Batch" },
  { value: "video", label: "Video" },
];

function statusDotClass(status: JobListItem["status"]) {
  if (status === "success") return "bg-emerald-400";
  if (status === "failed") return "bg-rose-400";
  if (status === "processing") return "bg-amber-400";
  return "bg-muted-foreground/70";
}

function StatusDot({ status }: { status: JobListItem["status"] }) {
  return (
    <span
      className={cn("inline-flex size-2.5 rounded-full", statusDotClass(status))}
      role="img"
      aria-label={`Status: ${status}`}
      title={status}
    />
  );
}

function modeTone(mode: JobListItem["processingMode"]) {
  if (mode === "video") return "warning";
  if (mode === "batch") return "success";
  return "neutral";
}

type HistoryListPanelShellProps = {
  query: HistoryListQuery;
  children: ReactNode;
};

export function HistoryListPanelShell({ query, children }: HistoryListPanelShellProps) {
  const router = useRouter();
  const [refreshing, startRefreshing] = useTransition();
  const [navigating, startNavigating] = useTransition();
  const [searchDraft, setSearchDraft] = useState(query.q);

  useEffect(() => {
    setSearchDraft(query.q);
  }, [query.q]);

  function navigate(nextQuery: HistoryListQuery) {
    startNavigating(() => {
      router.push(buildHistoryHref(nextQuery));
    });
  }

  function applySearch() {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query.q) {
      return;
    }

    navigate({
      ...query,
      page: 1,
      q: nextQuery,
    });
  }

  function refreshJobs() {
    startRefreshing(() => {
      router.refresh();
    });
  }

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
              History
            </CardDescription>
            <CardTitle className="font-display tracking-[0.03em] text-foreground">Job Timeline</CardTitle>
          </div>
          <Button
            variant="outline"
            onClick={refreshJobs}
            disabled={refreshing}
            className="w-full rounded-full border-primary/35 bg-primary/15 font-mono uppercase tracking-[0.12em] text-foreground hover:bg-primary/25 sm:w-auto"
          >
            <RefreshCw className={cn("size-3.5", refreshing ? "animate-spin" : "")} aria-hidden />
            Refresh
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-card/55 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by Job ID or API key"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              className="rounded-xl bg-background/60"
              aria-label="Search jobs"
            />
            <Button
              type="button"
              variant="outline"
              disabled={navigating || searchDraft.trim() === query.q}
              onClick={applySearch}
              className="rounded-full font-mono uppercase tracking-[0.12em]"
            >
              Apply
            </Button>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={query.status === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    navigate({
                      ...query,
                      page: 1,
                      status: filter.value,
                    })
                  }
                  disabled={navigating}
                  className="h-7 rounded-full font-mono text-[10px] uppercase tracking-[0.12em]"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Mode</p>
            <div className="flex flex-wrap gap-1.5">
              {MODE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={query.mode === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    navigate({
                      ...query,
                      page: 1,
                      mode: filter.value,
                    })
                  }
                  disabled={navigating}
                  className="h-7 rounded-full font-mono text-[10px] uppercase tracking-[0.12em]"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

type HistoryResultsSectionProps = {
  jobs: JobListItem[];
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  query: HistoryListQuery;
  totalCount: number;
};

export function HistoryResultsSection({
  jobs,
  currentPage,
  hasNextPage,
  hasPreviousPage,
  query,
  totalCount,
}: HistoryResultsSectionProps) {
  const router = useRouter();
  const [navigating, startNavigating] = useTransition();

  function openJobDetail(jobId: string) {
    startNavigating(() => {
      router.push(
        buildHistoryHref({
          ...query,
          page: currentPage,
          jobId,
        }),
      );
    });
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage === currentPage) {
      return;
    }

    startNavigating(() => {
      router.push(
        buildHistoryHref({
          ...query,
          page: nextPage,
        }),
      );
    });
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {jobs.length === 0 ? (
          <Empty className="rounded-xl border-border/70 bg-card/55 px-3 py-8">
            <EmptyHeader>
              <EmptyTitle className="font-mono text-xs uppercase tracking-[0.12em]">No matching jobs</EmptyTitle>
              <EmptyDescription className="font-mono text-xs text-muted-foreground">
                Adjust search or filters to find a request.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-border/70 bg-card/65 p-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Job ID</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{job.id}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Status</p>
                  <div className="mt-2">
                    <StatusDot status={job.status} />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Mode</p>
                  <div className="mt-1">
                    <ToneBadge tone={modeTone(job.processingMode)}>{job.processingMode}</ToneBadge>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{formatDate(job.createdAt)}</p>
              <Button
                variant="ghost"
                onClick={() => openJobDetail(job.id)}
                disabled={navigating}
                className="mt-3 w-full rounded-full font-mono uppercase tracking-[0.12em] text-primary hover:bg-primary/10"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Open details
              </Button>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card/55 md:block">
        <Table className="min-w-full text-left text-xs">
          <TableHeader className="bg-muted/90 font-mono uppercase tracking-[0.12em] text-muted-foreground">
            <TableRow>
              <TableHead className="w-10 px-3 py-2">
                <span className="sr-only">Status</span>
              </TableHead>
              <TableHead className="px-3 py-2">Job ID</TableHead>
              <TableHead className="px-3 py-2">Mode</TableHead>
              <TableHead className="px-3 py-2">Images</TableHead>
              <TableHead className="px-3 py-2">API key</TableHead>
              <TableHead className="px-3 py-2">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center font-mono text-xs text-muted-foreground">
                  No matching jobs found.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() => openJobDetail(job.id)}
                  className="cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/8"
                >
                  <TableCell className="px-3 py-2">
                    <StatusDot status={job.status} />
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate px-3 py-2 font-mono text-foreground">{job.id}</TableCell>
                  <TableCell className="px-3 py-2">
                    <ToneBadge tone={modeTone(job.processingMode)}>{job.processingMode}</ToneBadge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">
                    {job.processingMode === "batch" ? job.totalTasks : "--"}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-muted-foreground">{job.apiKeyPrefix || "--"}</TableCell>
                  <TableCell className="px-3 py-2 text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow>
              <TableCell colSpan={6} className="border-t border-border/60 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Page {currentPage} · {totalCount} total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={!hasPreviousPage || navigating}
                      onClick={() => goToPage(currentPage - 1)}
                      className="rounded-full font-mono uppercase tracking-[0.12em]"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!hasNextPage || navigating}
                      onClick={() => goToPage(currentPage + 1)}
                      className="rounded-full font-mono uppercase tracking-[0.12em]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/60 pt-3 md:hidden sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Page {currentPage} · {totalCount} total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!hasPreviousPage || navigating}
            onClick={() => goToPage(currentPage - 1)}
            className="rounded-full font-mono uppercase tracking-[0.12em]"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasNextPage || navigating}
            onClick={() => goToPage(currentPage + 1)}
            className="rounded-full font-mono uppercase tracking-[0.12em]"
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
