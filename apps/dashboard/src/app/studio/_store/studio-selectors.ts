import {
  JobRequestStatus,
  JobTaskStatus,
  type JobStatusResult,
  type JobType,
  type MaskArtifactResult,
} from "@segmentationapi/sdk";

import type { BoxCoordinates } from "../_components/studio-canvas-types";

export const DEFAULT_VIDEO_SAMPLING_FPS = 2;

export type PromptRow = {
  id: string;
  value: string;
};

export type StudioViewMode = "empty" | "single-image" | "batch-image" | "video";

export enum FileKind {
  Image = "image",
  Video = "video",
  None = "none",
}

export enum StudioRunMode {
  Idle = "idle",
  Running = "running",
  Ready = "ready",
}

export type StudioSelectorState = {
  files: File[];
  promptRows: PromptRow[];
  boxes: BoxCoordinates[];
  videoSourceFps: number | null;
  videoFpsParseState: "idle" | "parsing" | "ready" | "error";
  videoFpsParseError: string | null;
  runError: string | null;
  refreshError: string | null;
  lastRefreshedAt: number | null;
  runState: {
    mode: StudioRunMode;
    selectedType?: JobType;
    jobId?: string;
    videoSamplingFps?: number;
  };
  jobStatus: JobStatusResult | null;
  taskMasksByTaskId: Record<string, MaskArtifactResult[]>;
  videoBakedUrlByTaskId: Record<string, string | null>;
};

export function classifyFiles(files: File[]): FileKind {
  if (files.length === 0) return FileKind.None;
  const firstIsVideo = files[0]!.type.startsWith("video/");
  return firstIsVideo ? FileKind.Video : FileKind.Image;
}

export function trimPrompts(promptRows: readonly PromptRow[]) {
  return promptRows.map((promptRow) => promptRow.value.trim()).filter(Boolean);
}

export function selectFileKind(state: Pick<StudioSelectorState, "files">): FileKind {
  return classifyFiles(state.files);
}

export function selectImageFiles(state: Pick<StudioSelectorState, "files">) {
  return state.files.filter((file) => file.type.startsWith("image/"));
}

export function selectFirstVideoFile(state: Pick<StudioSelectorState, "files">) {
  return state.files.find((file) => file.type.startsWith("video/")) ?? null;
}

export function selectCleanPrompts(state: Pick<StudioSelectorState, "promptRows">) {
  return trimPrompts(state.promptRows);
}

export function selectCleanPromptCount(state: Pick<StudioSelectorState, "promptRows">) {
  return selectCleanPrompts(state).length;
}

export function selectHasPromptBoxParity(
  state: Pick<StudioSelectorState, "files" | "promptRows" | "boxes">,
) {
  const fileKind = selectFileKind(state);
  if (fileKind !== FileKind.Image || state.boxes.length === 0) {
    return true;
  }

  return selectCleanPrompts(state).length === state.boxes.length;
}

export function selectCanRun(
  state: Pick<
    StudioSelectorState,
    "runState" | "files" | "promptRows" | "boxes" | "videoSourceFps" | "videoFpsParseState"
  >,
) {
  const hasRequiredPrompt = selectCleanPrompts(state).length > 0;
  const isVideo = selectFileKind(state) === FileKind.Video;
  const hasReadyVideoMetadata = !isVideo || state.videoFpsParseState === "ready";

  return (
    state.runState.mode !== StudioRunMode.Running &&
    selectFileKind(state) !== FileKind.None &&
    hasRequiredPrompt &&
    selectHasPromptBoxParity(state) &&
    hasReadyVideoMetadata &&
    (!isVideo || selectHasValidVideoSamplingFps(state))
  );
}

export function selectResolvedVideoSamplingFps(
  state: Pick<StudioSelectorState, "runState">,
) {
  const samplingFps = state.runState.videoSamplingFps;
  if (!Number.isInteger(samplingFps) || Number(samplingFps) < 1) {
    return DEFAULT_VIDEO_SAMPLING_FPS;
  }

  return Number(samplingFps);
}

export function selectHasValidVideoSamplingFps(
  state: Pick<StudioSelectorState, "runState" | "videoSourceFps">,
) {
  const samplingFps = state.runState.videoSamplingFps;
  const maxSourceFps = state.videoSourceFps ? Math.max(1, Math.floor(state.videoSourceFps)) : null;

  if (!Number.isInteger(samplingFps) || Number(samplingFps) < 1) {
    return false;
  }
  if (maxSourceFps === null) {
    return true;
  }

  return Number(samplingFps) <= maxSourceFps;
}

export function isTerminalJobStatus(status: JobStatusResult["status"] | undefined) {
  return (
    status === JobRequestStatus.Completed ||
    status === JobRequestStatus.CompletedWithErrors ||
    status === JobRequestStatus.Failed
  );
}

export function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function selectProgressText(state: Pick<StudioSelectorState, "jobStatus">) {
  if (!state.jobStatus) {
    return null;
  }

  return `${state.jobStatus.successItems + state.jobStatus.failedItems}/${state.jobStatus.totalItems}`;
}

export function selectCurrentAsyncJobId(state: Pick<StudioSelectorState, "runState">) {
  return state.runState.jobId ?? null;
}

export function selectHasOutputs(state: Pick<StudioSelectorState, "runState">) {
  return state.runState.mode === StudioRunMode.Ready && Boolean(selectCurrentAsyncJobId(state));
}

export function selectFirstImagePreviewUrl(imagePreviewUrls: readonly string[]) {
  return imagePreviewUrls[0] ?? null;
}

export function selectStudioViewMode(
  state: Pick<StudioSelectorState, "files">,
  imagePreviewUrls: readonly string[],
  videoPreviewUrl: string | null,
): StudioViewMode {
  const fileKind = selectFileKind(state);

  if (fileKind === FileKind.Video && videoPreviewUrl) {
    return "video";
  }

  if (fileKind === FileKind.Image && selectFirstImagePreviewUrl(imagePreviewUrls)) {
    return imagePreviewUrls.length === 1 ? "single-image" : "batch-image";
  }

  return "empty";
}

export function selectBatchItemCount(state: Pick<StudioSelectorState, "jobStatus">) {
  return state.jobStatus?.items?.length ?? 0;
}

export function selectCarouselIndex(
  state: Pick<StudioSelectorState, "jobStatus">,
  batchCarouselIndex: number,
) {
  const batchItemCount = selectBatchItemCount(state);
  return batchItemCount > 0 ? Math.min(batchCarouselIndex, batchItemCount - 1) : 0;
}

export function selectActiveBatchItem(
  state: Pick<StudioSelectorState, "jobStatus">,
  batchCarouselIndex: number,
) {
  const carouselIndex = selectCarouselIndex(state, batchCarouselIndex);
  return state.jobStatus?.items?.[carouselIndex] ?? null;
}

export function selectBatchImageUrl(
  imagePreviewUrls: readonly string[],
  batchCarouselIndex: number,
) {
  return imagePreviewUrls[batchCarouselIndex] ?? imagePreviewUrls[0] ?? null;
}

export function selectActiveVideoItemTaskId(state: Pick<StudioSelectorState, "jobStatus">) {
  return (
    state.jobStatus?.items?.find((item) => item.status === JobTaskStatus.Success)?.taskId ??
    state.jobStatus?.items?.[0]?.taskId ??
    null
  );
}

export function selectActiveVideoBakedUrl(
  state: Pick<StudioSelectorState, "jobStatus" | "videoBakedUrlByTaskId">,
) {
  const activeVideoItemTaskId = selectActiveVideoItemTaskId(state);
  if (!activeVideoItemTaskId) {
    return null;
  }

  return state.videoBakedUrlByTaskId[activeVideoItemTaskId] ?? null;
}

export function selectIsSingleImageView(imageFiles: readonly File[]) {
  return imageFiles.length === 1;
}

export function selectSingleImageMasks(
  state: Pick<StudioSelectorState, "runState" | "jobStatus" | "taskMasksByTaskId">,
  imageFiles: readonly File[],
) {
  if (
    state.runState.mode !== StudioRunMode.Ready ||
    state.runState.selectedType !== "image_batch" ||
    !selectIsSingleImageView(imageFiles) ||
    !state.jobStatus ||
    !isTerminalJobStatus(state.jobStatus.status)
  ) {
    return null;
  }

  const firstTaskId = state.jobStatus.items?.[0]?.taskId;
  return firstTaskId ? state.taskMasksByTaskId[firstTaskId] ?? null : null;
}

export function selectVideoFpsRange(
  state: Pick<StudioSelectorState, "videoSourceFps" | "runState">,
) {
  const min = 1;
  const max = state.videoSourceFps ? Math.max(1, Math.floor(state.videoSourceFps)) : null;
  const rawValue = state.runState.videoSamplingFps;
  const safeRaw = Number.isFinite(rawValue) ? Number(rawValue) : min;
  const value = max === null ? Math.max(min, safeRaw) : Math.min(max, Math.max(min, safeRaw));

  return { min, max, value };
}

export function selectCanRefresh(state: Pick<StudioSelectorState, "runState">) {
  return Boolean(state.runState.jobId);
}

export function selectStudioModeLabel(state: Pick<StudioSelectorState, "files">) {
  const fileKind = classifyFiles(state.files);
  if (fileKind === FileKind.Video) {
    return "Video";
  }

  if (fileKind === FileKind.Image) {
    return state.files.length === 1 ? "Single Image" : "Image Batch";
  }

  return "No Media";
}

export function selectJobStatusTone(
  state: Pick<StudioSelectorState, "runState" | "jobStatus">,
): "neutral" | "warning" | "danger" | "success" {
  if (!state.jobStatus) {
    return state.runState.mode === StudioRunMode.Running ? "warning" : "neutral";
  }

  if (state.jobStatus.status === JobRequestStatus.Failed) {
    return "danger";
  }
  if (state.jobStatus.status === JobRequestStatus.CompletedWithErrors) {
    return "warning";
  }
  if (state.jobStatus.status === JobRequestStatus.Completed) {
    return "success";
  }

  return "neutral";
}
