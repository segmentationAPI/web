import type { Route } from "next";
import type { JobListItem } from "@/lib/dashboard-types";

export type HistoryStatusFilter = "all" | JobListItem["status"];
export type HistoryModeFilter = "all" | JobListItem["processingMode"];

export type HistoryListQuery = {
  page: number;
  q: string;
  status: HistoryStatusFilter;
  mode: HistoryModeFilter;
};

const VALID_STATUS_FILTERS = new Set<HistoryStatusFilter>([
  "all",
  "queued",
  "processing",
  "success",
  "failed",
]);

const VALID_MODE_FILTERS = new Set<HistoryModeFilter>(["all", "single", "batch", "video"]);

export function normalizeHistoryListQuery(searchParams: {
  page?: string;
  q?: string;
  status?: string;
  mode?: string;
}): HistoryListQuery {
  const parsedPage = Number(searchParams.page);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  const q = (searchParams.q ?? "").trim();
  const status = VALID_STATUS_FILTERS.has(searchParams.status as HistoryStatusFilter)
    ? (searchParams.status as HistoryStatusFilter)
    : "all";
  const mode = VALID_MODE_FILTERS.has(searchParams.mode as HistoryModeFilter)
    ? (searchParams.mode as HistoryModeFilter)
    : "all";

  return {
    page,
    q,
    status,
    mode,
  };
}

function buildHistorySearchParams(query: HistoryListQuery): URLSearchParams {
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

  return search;
}

export function buildHistoryHref(params: HistoryListQuery & { jobId?: string | null }): Route {
  const search = buildHistorySearchParams(params);

  if (params.jobId) {
    return `/history/${params.jobId}?${search.toString()}` as Route;
  }

  return `/history?${search.toString()}` as Route;
}
