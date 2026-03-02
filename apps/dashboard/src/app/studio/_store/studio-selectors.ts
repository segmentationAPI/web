import {
  JobRequestStatus,
  JobTaskStatus,
  type JobStatusResult,
  type JobType,
  type MaskArtifactResult,
  type VideoFrameMaskMap,
} from "@segmentationapi/sdk";

import type { BoxCoordinates } from "../_components/studio-canvas-types";

const EMPTY_VIDEO_FRAME_MASKS: VideoFrameMaskMap = {};

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
  prompts: string[];
  boxes: BoxCoordinates[];
  runState: {
    mode: StudioRunMode;
    selectedType?: JobType;
    jobId?: string;
  };
  jobStatus: JobStatusResult | null;
  taskMasksByTaskId: Record<string, MaskArtifactResult[]>;
  videoFrameMasksByTaskId: Record<string, VideoFrameMaskMap>;
};

export function classifyFiles(files: File[]): FileKind {
  if (files.length === 0) return FileKind.None;
  const firstIsVideo = files[0]!.type.startsWith("video/");
  return firstIsVideo ? FileKind.Video : FileKind.Image;
}

export function trimPrompts(prompts: string[]) {
  return prompts.map((prompt) => prompt.trim()).filter(Boolean);
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

export function selectCleanPrompts(state: Pick<StudioSelectorState, "prompts">) {
  return trimPrompts(state.prompts);
}

export function selectHasPromptBoxParity(
  state: Pick<StudioSelectorState, "files" | "prompts" | "boxes">,
) {
  const fileKind = selectFileKind(state);
  if (fileKind !== FileKind.Image || state.boxes.length === 0) {
    return true;
  }

  return selectCleanPrompts(state).length === state.boxes.length;
}

export function selectCanRun(
  state: Pick<StudioSelectorState, "runState" | "files" | "prompts" | "boxes">,
) {
  const hasRequiredPrompt = selectCleanPrompts(state).length > 0;
  return (
    state.runState.mode !== StudioRunMode.Running &&
    selectFileKind(state) !== FileKind.None &&
    hasRequiredPrompt &&
    selectHasPromptBoxParity(state)
  );
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

export function selectIsImagePreviewMode(fileKind: FileKind, firstImagePreviewUrl: string | null) {
  return fileKind === FileKind.Image && Boolean(firstImagePreviewUrl);
}

export function selectIsVideoPreviewMode(fileKind: FileKind, videoPreviewUrl: string | null) {
  return fileKind === FileKind.Video && Boolean(videoPreviewUrl);
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

export function selectActiveVideoFrameMasks(
  state: Pick<StudioSelectorState, "jobStatus" | "videoFrameMasksByTaskId">,
) {
  const activeVideoItemTaskId = selectActiveVideoItemTaskId(state);
  if (!activeVideoItemTaskId) {
    return EMPTY_VIDEO_FRAME_MASKS;
  }

  return state.videoFrameMasksByTaskId[activeVideoItemTaskId] ?? EMPTY_VIDEO_FRAME_MASKS;
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
