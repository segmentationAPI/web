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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobListItem } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import { type HistoryListQuery } from "./history-query";
import {
  buildHistoryHref,
  HistoryModeFilterGroup,
  HistoryPagination,
  HistoryStatusDot,
  HistoryStatusFilterGroup,
} from "./history-shared";

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
    <Card className="glass-panel border-border/70 bg-card/75 rounded-[1.35rem] py-6">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardDescription className="text-muted-foreground font-mono tracking-[0.14em] uppercase">
              History
            </CardDescription>
            <CardTitle className="font-display text-foreground tracking-[0.03em]">
              Job Timeline
            </CardTitle>
          </div>
          <Button
            variant="outline"
            onClick={refreshJobs}
            disabled={refreshing}
            className="border-primary/35 bg-primary/15 text-foreground hover:bg-primary/25 w-full rounded-full font-mono tracking-[0.12em] uppercase sm:w-auto"
          >
            <RefreshCw className={cn("size-3.5", refreshing ? "animate-spin" : "")} aria-hidden />
            Refresh
          </Button>
        </div>

        <div className="border-border/60 bg-card/55 space-y-3 rounded-xl border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by Job ID"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              className="bg-background/60 rounded-xl"
              aria-label="Search jobs"
            />
            <Button
              type="button"
              variant="outline"
              disabled={navigating || searchDraft.trim() === query.q}
              onClick={applySearch}
              className="rounded-full font-mono tracking-[0.12em] uppercase"
            >
              Apply
            </Button>
          </div>

          <HistoryStatusFilterGroup
            activeValue={query.status}
            disabled={navigating}
            onSelect={(status) =>
              navigate({
                ...query,
                page: 1,
                status,
              })
            }
          />

          <HistoryModeFilterGroup
            activeValue={query.mode}
            disabled={navigating}
            onSelect={(mode) =>
              navigate({
                ...query,
                page: 1,
                mode,
              })
            }
          />
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
        buildHistoryHref(
          {
            ...query,
            page: currentPage,
          },
          jobId,
        ),
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
          <Empty className="border-border/70 bg-card/55 rounded-xl px-3 py-8">
            <EmptyHeader>
              <EmptyTitle className="font-mono text-xs tracking-[0.12em] uppercase">
                No matching jobs
              </EmptyTitle>
              <EmptyDescription className="text-muted-foreground font-mono text-xs">
                Adjust search or filters to find a request.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="border-border/70 bg-card/65 rounded-2xl border p-3">
              <div>
                <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                  Job ID
                </p>
                <p className="text-foreground mt-1 font-mono text-xs break-all">{job.id}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                    Status
                  </p>
                  <div className="mt-2">
                    <HistoryStatusDot status={job.status} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                    Mode
                  </p>
                  <div className="mt-1">
                    <ToneBadge tone={modeTone(job.processingMode)}>{job.processingMode}</ToneBadge>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-xs">{formatDate(job.createdAt)}</p>
              <Button
                variant="ghost"
                onClick={() => openJobDetail(job.id)}
                disabled={navigating}
                className="text-primary hover:bg-primary/10 mt-3 w-full rounded-full font-mono tracking-[0.12em] uppercase"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Open details
              </Button>
            </article>
          ))
        )}
      </div>

      <div className="border-border/70 bg-card/55 hidden overflow-hidden rounded-2xl border md:block">
        <Table className="min-w-full text-left text-xs">
          <TableHeader className="bg-muted/90 text-muted-foreground font-mono tracking-[0.12em] uppercase">
            <TableRow>
              <TableHead className="w-10 px-3 py-2">
                <span className="sr-only">Status</span>
              </TableHead>
              <TableHead className="px-3 py-2">Job ID</TableHead>
              <TableHead className="px-3 py-2">Mode</TableHead>
              <TableHead className="px-3 py-2">Images</TableHead>
              <TableHead className="px-3 py-2">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground px-3 py-8 text-center font-mono text-xs"
                >
                  No matching jobs found.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() => openJobDetail(job.id)}
                  className="border-border/60 hover:bg-primary/8 cursor-pointer border-t transition-colors"
                >
                  <TableCell className="px-3 py-2">
                    <HistoryStatusDot status={job.status} />
                  </TableCell>
                  <TableCell className="text-foreground max-w-[240px] truncate px-3 py-2 font-mono">
                    {job.id}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <ToneBadge tone={modeTone(job.processingMode)}>{job.processingMode}</ToneBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2">
                    {job.processingMode === "batch" ? job.totalTasks : "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2">
                    {formatDate(job.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow>
              <TableCell colSpan={5} className="border-border/60 border-t px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <HistoryPagination
                    currentPage={currentPage}
                    disabled={navigating}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    totalCount={totalCount}
                    onPageChange={goToPage}
                  />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="border-border/60 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
        <HistoryPagination
          currentPage={currentPage}
          disabled={navigating}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          totalCount={totalCount}
          onPageChange={goToPage}
        />
      </div>
    </>
  );
}
