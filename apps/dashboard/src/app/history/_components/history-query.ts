import type { JobListItem } from "@/lib/dashboard-types";

export type HistoryStatusFilter = "all" | JobListItem["status"];
export type HistoryModeFilter = "all" | JobListItem["processingMode"];

export type HistoryListQuery = {
  page: number;
  q: string;
  status: HistoryStatusFilter;
  mode: HistoryModeFilter;
};

export const HISTORY_STATUS_FILTERS: Array<{ value: HistoryStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

export const HISTORY_MODE_FILTERS: Array<{ value: HistoryModeFilter; label: string }> = [
  { value: "all", label: "All modes" },
  { value: "single", label: "Single" },
  { value: "batch", label: "Batch" },
  { value: "video", label: "Video" },
];

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
