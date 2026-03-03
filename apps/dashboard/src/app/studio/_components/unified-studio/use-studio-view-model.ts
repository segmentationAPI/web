"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  FileKind,
  StudioRunMode,
  formatStatus,
  selectActiveBatchItem,
  selectActiveVideoBakedUrl,
  selectActiveVideoTimeline,
  selectBatchImageUrl,
  selectCanRefresh,
  selectCanRun,
  selectCarouselIndex,
  selectCleanPromptCount,
  selectCurrentAsyncJobId,
  selectFirstImagePreviewUrl,
  selectFirstVideoFile,
  selectHasOutputs,
  selectImageFiles,
  selectJobStatusTone,
  selectProgressText,
  selectResolvedVideoExclusiveMode,
  selectSingleImageMasks,
  selectStatusSummaryLine,
  selectStudioViewMode,
  selectVideoFpsRange,
  type PromptRow,
} from "../../_store/studio-selectors";
import { useStudioStore } from "../../_store/use-studio-store";
import { useFilePreviewUrls } from "./use-file-preview-urls";

const SYNTHETIC_PROMPT_ROW: PromptRow[] = [{ id: "synthetic-prompt", value: "__placeholder_prompt__" }];

export function useBindStudioUser(userId: string) {
  const setUserId = useStudioStore((state) => state.setUserId);

  useEffect(() => {
    setUserId(userId);
  }, [setUserId, userId]);
}

export function useStudioStatusHeaderViewModel() {
  const { runState, jobStatus, statusRefreshing, refreshJobStatus } = useStudioStore(
    useShallow((state) => ({
      runState: state.runState,
      jobStatus: state.jobStatus,
      statusRefreshing: state.statusRefreshing,
      refreshJobStatus: state.refreshJobStatus,
    })),
  );

  const statusTone = selectJobStatusTone({ runState, jobStatus });
  const statusSummary = selectStatusSummaryLine({ runState, jobStatus });
  const statusLabel = formatStatus(jobStatus?.status ?? runState.mode);
  const canRefresh = selectCanRefresh({ runState });

  const onRefresh = useCallback(() => {
    void refreshJobStatus();
  }, [refreshJobStatus]);

  return {
    statusTone,
    statusSummary,
    statusLabel,
    canRefresh,
    statusRefreshing,
    onRefresh,
  };
}

export function useStudioMetadataViewModel() {
  const { runState, jobStatus, lastRefreshedAt } = useStudioStore(
    useShallow((state) => ({
      runState: state.runState,
      jobStatus: state.jobStatus,
      lastRefreshedAt: state.lastRefreshedAt,
    })),
  );

  const currentAsyncJobId = selectCurrentAsyncJobId({ runState });
  const progressText = selectProgressText({ jobStatus });
  const showMetadata = Boolean(currentAsyncJobId || progressText || lastRefreshedAt);

  return {
    currentAsyncJobId,
    progressText,
    lastRefreshedAt,
    showMetadata,
  };
}

export function useStudioErrorViewModel() {
  return useStudioStore(
    useShallow((state) => ({
      runError: state.runError,
      refreshError: state.refreshError,
    })),
  );
}

export function useStudioControlsViewModel() {
  const {
    files,
    promptRows,
    boxes,
    runState,
    videoFpsParseState,
    videoFpsParseError,
    videoSourceFps,
    hasAttemptedEmptyPromptSubmit,
    setFiles,
    addPromptRow,
    updatePromptRow,
    removePromptRow,
    setVideoSamplingFps,
    setVideoExclusiveMode,
    setHasAttemptedEmptyPromptSubmit,
  } = useStudioStore(
    useShallow((state) => ({
      files: state.files,
      promptRows: state.promptRows,
      boxes: state.boxes,
      runState: state.runState,
      videoFpsParseState: state.videoFpsParseState,
      videoFpsParseError: state.videoFpsParseError,
      videoSourceFps: state.videoSourceFps,
      hasAttemptedEmptyPromptSubmit: state.hasAttemptedEmptyPromptSubmit,
      setFiles: state.setFiles,
      addPromptRow: state.addPromptRow,
      updatePromptRow: state.updatePromptRow,
      removePromptRow: state.removePromptRow,
      setVideoSamplingFps: state.setVideoSamplingFps,
      setVideoExclusiveMode: state.setVideoExclusiveMode,
      setHasAttemptedEmptyPromptSubmit: state.setHasAttemptedEmptyPromptSubmit,
    })),
  );

  const fileKind = useMemo(() => {
    if (files.length === 0) {
      return FileKind.None;
    }

    return files[0]!.type.startsWith("video/") ? FileKind.Video : FileKind.Image;
  }, [files]);

  const isRunning = runState.mode === StudioRunMode.Running;
  const cleanPromptCount = selectCleanPromptCount({ promptRows });
  const hasPromptParityIssue = boxes.length > 0 && cleanPromptCount !== boxes.length;
  const videoFpsRange = selectVideoFpsRange({ videoSourceFps, runState });
  const videoExclusiveMode = selectResolvedVideoExclusiveMode({ runState });

  const videoFpsStatusText =
    videoFpsParseState === "parsing"
      ? "Reading video metadata…"
      : videoFpsParseState === "ready" && videoFpsRange.max
        ? `${videoFpsRange.value} FPS / ${videoFpsRange.max} max`
        : "Waiting for metadata.";

  useEffect(() => {
    if (cleanPromptCount > 0 && hasAttemptedEmptyPromptSubmit) {
      setHasAttemptedEmptyPromptSubmit(false);
    }
  }, [cleanPromptCount, hasAttemptedEmptyPromptSubmit, setHasAttemptedEmptyPromptSubmit]);

  const onFileSelection = useCallback(
    (nextFiles: FileList | null) => {
      void setFiles(Array.from(nextFiles ?? []));
    },
    [setFiles],
  );

  const onRemoveFile = useCallback(
    (index: number) => {
      const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
      void setFiles(nextFiles);
    },
    [files, setFiles],
  );

  const onPromptChange = useCallback(
    (promptRowId: string, value: string) => {
      updatePromptRow(promptRowId, value);
    },
    [updatePromptRow],
  );

  const onAddPromptRow = useCallback(() => {
    addPromptRow();
  }, [addPromptRow]);

  const onRemovePromptRow = useCallback(
    (promptRowId: string) => {
      removePromptRow(promptRowId);
    },
    [removePromptRow],
  );

  const promptPlaceholder =
    fileKind === FileKind.Video ? "describe object(s) to segment" : "object to segment";

  return {
    files,
    promptRows,
    boxCount: boxes.length,
    fileKind,
    isRunning,
    cleanPromptCount,
    hasPromptParityIssue,
    hasAttemptedEmptyPromptSubmit,
    promptPlaceholder,
    videoFpsParseState,
    videoFpsParseError,
    videoFpsRange,
    videoFpsStatusText,
    videoExclusiveMode,
    showVideoControls: fileKind === FileKind.Video,
    onPromptChange,
    onAddPromptRow,
    onRemovePromptRow,
    onFileSelection,
    onRemoveFile,
    onSetVideoSamplingFps: setVideoSamplingFps,
    onSetVideoExclusiveMode: setVideoExclusiveMode,
  };
}

export function useStudioPreviewViewModel() {
  const {
    files,
    boxes,
    runState,
    jobStatus,
    taskMasksByTaskId,
    videoTimelineByTaskId,
    videoBakedUrlByTaskId,
    batchCarouselIndex,
    addBox,
    clearBoxes,
    setBatchCarouselIndex,
  } = useStudioStore(
    useShallow((state) => ({
      files: state.files,
      boxes: state.boxes,
      runState: state.runState,
      jobStatus: state.jobStatus,
      taskMasksByTaskId: state.taskMasksByTaskId,
      videoTimelineByTaskId: state.videoTimelineByTaskId,
      videoBakedUrlByTaskId: state.videoBakedUrlByTaskId,
      batchCarouselIndex: state.batchCarouselIndex,
      addBox: state.addBox,
      clearBoxes: state.clearBoxes,
      setBatchCarouselIndex: state.setBatchCarouselIndex,
    })),
  );

  const imageFiles = useMemo(() => selectImageFiles({ files }), [files]);
  const firstVideoFile = useMemo(() => selectFirstVideoFile({ files }), [files]);
  const { imagePreviewUrls, videoPreviewUrl } = useFilePreviewUrls(imageFiles, firstVideoFile);

  const hasOutputs = selectHasOutputs({ runState });
  const viewMode = selectStudioViewMode({ files }, imagePreviewUrls, videoPreviewUrl);
  const carouselIndex = selectCarouselIndex({ jobStatus }, batchCarouselIndex);
  const activeBatchItem = selectActiveBatchItem({ jobStatus }, batchCarouselIndex);
  const batchImageUrl = selectBatchImageUrl(imagePreviewUrls, carouselIndex);
  const activeVideoTimeline = selectActiveVideoTimeline({ jobStatus, videoTimelineByTaskId });
  const activeVideoBakedUrl = selectActiveVideoBakedUrl({ jobStatus, videoBakedUrlByTaskId });
  const singleImageMasks = selectSingleImageMasks({ runState, jobStatus, taskMasksByTaskId }, imageFiles);
  const resolvedVideoExclusiveMode = selectResolvedVideoExclusiveMode({ runState });
  const firstImagePreviewUrl = selectFirstImagePreviewUrl(imagePreviewUrls);
  const activeBatchMasks = activeBatchItem
    ? (taskMasksByTaskId[activeBatchItem.taskId] ?? [])
    : [];
  const isRunning = runState.mode === StudioRunMode.Running;

  return {
    boxes,
    imageFiles,
    imagePreviewUrls,
    videoPreviewUrl,
    hasOutputs,
    viewMode,
    carouselIndex,
    activeBatchItem,
    activeBatchMasks,
    batchImageUrl,
    activeVideoTimeline,
    activeVideoBakedUrl,
    singleImageMasks,
    resolvedVideoExclusiveMode,
    firstImagePreviewUrl,
    isRunning,
    onBoxAdded: addBox,
    onClearBoxes: clearBoxes,
    onSetBatchCarouselIndex: setBatchCarouselIndex,
  };
}

export function useStudioFooterViewModel() {
  const {
    runState,
    files,
    promptRows,
    boxes,
    videoSourceFps,
    videoFpsParseState,
    uploadProgress,
    apiKey,
    setApiKey,
    runJob,
    resetStudio,
    setHasAttemptedEmptyPromptSubmit,
  } = useStudioStore(
    useShallow((state) => ({
      runState: state.runState,
      files: state.files,
      promptRows: state.promptRows,
      boxes: state.boxes,
      videoSourceFps: state.videoSourceFps,
      videoFpsParseState: state.videoFpsParseState,
      uploadProgress: state.uploadProgress,
      apiKey: state.apiKey,
      setApiKey: state.setApiKey,
      runJob: state.runJob,
      resetStudio: state.resetStudio,
      setHasAttemptedEmptyPromptSubmit: state.setHasAttemptedEmptyPromptSubmit,
    })),
  );

  const canRun = useStudioStore(selectCanRun);
  const cleanPromptCount = selectCleanPromptCount({ promptRows });
  const isRunning = runState.mode === StudioRunMode.Running;

  const canRunWithSyntheticPrompt = useMemo(
    () =>
      selectCanRun({
        runState,
        files,
        promptRows: SYNTHETIC_PROMPT_ROW,
        boxes,
        videoSourceFps,
        videoFpsParseState,
      }),
    [runState, files, boxes, videoSourceFps, videoFpsParseState],
  );

  const canAttemptRunWithoutPrompts =
    cleanPromptCount < 1 && !canRun && canRunWithSyntheticPrompt;
  const canPressRun = canRun || canAttemptRunWithoutPrompts;

  const onRunJob = useCallback(() => {
    if (cleanPromptCount < 1) {
      setHasAttemptedEmptyPromptSubmit(true);
      return;
    }

    setHasAttemptedEmptyPromptSubmit(false);
    void runJob();
  }, [cleanPromptCount, runJob, setHasAttemptedEmptyPromptSubmit]);

  const onResetStudio = useCallback(() => {
    setHasAttemptedEmptyPromptSubmit(false);
    resetStudio();
  }, [resetStudio, setHasAttemptedEmptyPromptSubmit]);

  const onClearApiKey = useCallback(() => {
    setApiKey("");
  }, [setApiKey]);

  return {
    isRunning,
    canPressRun,
    uploadProgress,
    apiKey,
    onRunJob,
    onResetStudio,
    onSetApiKey: setApiKey,
    onClearApiKey,
  };
}
