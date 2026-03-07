"use client";

import { type ReactNode } from "react";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { DashboardPageShell } from "@/components/dashboard-page-shell";
import type { JobListItem } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

import {
  type HistoryListQuery,
  type HistoryModeFilter,
  type HistoryStatusFilter,
  HISTORY_MODE_FILTERS,
  HISTORY_STATUS_FILTERS,
} from "./history-query";

function statusDotClass(status: JobListItem["status"]) {
  if (status === "success") return "bg-emerald-400";
  if (status === "failed") return "bg-rose-400";
  if (status === "processing") return "bg-amber-400";
  return "bg-muted-foreground/70";
}

export function HistoryPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DashboardPageShell
      className={cn("max-w-[1320px] gap-4 pb-8 pt-3 sm:gap-5 sm:pb-10 sm:pt-4", className)}
    >
      {children}
    </DashboardPageShell>
  );
}

export function HistoryStatusDot({ status }: { status: JobListItem["status"] }) {
  return (
    <span
      className={cn("inline-flex size-2.5 rounded-full", statusDotClass(status))}
      role="img"
      aria-label={`Status: ${status}`}
      title={status}
    />
  );
}

export function buildHistoryHref(query: HistoryListQuery, jobId?: string): Route {
  const search = new URLSearchParams();
  search.set("page", String(query.page));

  if (query.q.length > 0) {
    search.set("q", query.q);
  }

  if (query.status !== "all") {
    search.set("status", query.status);
  }

  if (query.mode !== "all") {
    search.set("mode", query.mode);
  }

  const queryString = search.toString();
  const pathname = jobId ? `/history/${jobId}` : "/history";
  return (queryString.length > 0 ? `${pathname}?${queryString}` : pathname) as Route;
}

export function HistoryFilterGroup<TFilter extends HistoryStatusFilter | HistoryModeFilter>({
  activeValue,
  disabled,
  filters,
  label,
  onSelect,
}: {
  activeValue: TFilter;
  disabled: boolean;
  filters: Array<{ label: string; value: TFilter }>;
  label: string;
  onSelect: (value: TFilter) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={activeValue === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(filter.value)}
            disabled={disabled}
            className="h-7 rounded-full font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function HistoryStatusFilterGroup(props: {
  activeValue: HistoryStatusFilter;
  disabled: boolean;
  onSelect: (value: HistoryStatusFilter) => void;
}) {
  return <HistoryFilterGroup {...props} filters={HISTORY_STATUS_FILTERS} label="Status" />;
}

export function HistoryModeFilterGroup(props: {
  activeValue: HistoryModeFilter;
  disabled: boolean;
  onSelect: (value: HistoryModeFilter) => void;
}) {
  return <HistoryFilterGroup {...props} filters={HISTORY_MODE_FILTERS} label="Mode" />;
}

export function HistoryPagination({
  currentPage,
  disabled,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  onPageChange,
}: {
  currentPage: number;
  disabled: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        Page {currentPage} · {totalCount} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!hasPreviousPage || disabled}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-full font-mono uppercase tracking-[0.12em]"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!hasNextPage || disabled}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-full font-mono uppercase tracking-[0.12em]"
        >
          Next
        </Button>
      </div>
    </>
  );
}
