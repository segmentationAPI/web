import { create } from "zustand";
import {
  JobTaskStatus,
  SegmentationClient,
  buildOutputManifestUrl,
  normalizeMaskArtifacts,
  resolveManifestResultForTask,
  resolveOutputFolder,
  type JobStatusResult,
  type MaskArtifactResult,
} from "@segmentationapi/sdk";

import { authClient } from "@/lib/auth-client";

import type { BoxCoordinates } from "../_components/studio-canvas-types";
import { parseVideoSourceFps } from "../_lib/video-fps-parser";
import {
  DEFAULT_VIDEO_SAMPLING_FPS,
  FileKind,
  StudioRunMode,
  classifyFiles,
  selectCanRun,
  selectCleanPrompts,
  selectFileKind,
  selectHasValidVideoSamplingFps,
  selectImageFiles,
  selectVideoFpsRange,
  type PromptRow,
  type StudioSelectorState,
} from "./studio-selectors";

type UploadProgress = { done: number; total: number };

type LoadedMaskEntry = {
  taskId: string;
  masks: MaskArtifactResult[];
  bakedVideoUrl: string | null;
};

type StudioState = StudioSelectorState & {
  userId: string;
  apiKey: string;
  uploadProgress: UploadProgress;
  statusRefreshing: boolean;
  batchCarouselIndex: number;
  hasAttemptedEmptyPromptSubmit: boolean;
};

type StudioActions = {
  setUserId: (userId: string) => void;
  setApiKey: (apiKey: string) => void;
  setFiles: (files: File[]) => Promise<void>;
  addPromptRow: () => void;
  updatePromptRow: (promptRowId: string, value: string) => void;
  removePromptRow: (promptRowId: string) => void;
  setHasAttemptedEmptyPromptSubmit: (attempted: boolean) => void;
  addBox: (box: BoxCoordinates) => void;
  clearBoxes: () => void;
  setBatchCarouselIndex: (index: number) => void;
  setVideoSamplingFps: (fps: number) => void;
  resetStudio: () => void;
  refreshJobStatus: (jobIdOverride?: string, silent?: boolean) => Promise<void>;
  runJob: () => Promise<void>;
};

type StudioStore = StudioState & StudioActions;

const INITIAL_UPLOAD_PROGRESS: UploadProgress = { done: 0, total: 0 };
let promptRowIdSequence = 0;

function createPromptRow(value = ""): PromptRow {
  promptRowIdSequence += 1;
  return {
    id: `prompt-${promptRowIdSequence}`,
    value,
  };
}

function createInitialState(userId = ""): StudioState {
  return {
    userId,
    apiKey: "",
    files: [],
    promptRows: [createPromptRow()],
    boxes: [],
    videoSourceFps: null,
    videoFpsParseState: "idle",
    videoFpsParseError: null,
    runError: null,
    refreshError: null,
    lastRefreshedAt: null,
    runState: { mode: StudioRunMode.Idle },
    uploadProgress: INITIAL_UPLOAD_PROGRESS,
    jobStatus: null,
    taskMasksByTaskId: {},
    videoBakedUrlByTaskId: {},
    statusRefreshing: false,
    batchCarouselIndex: 0,
    hasAttemptedEmptyPromptSubmit: false,
  };
}

function normalizeSelectedFiles(nextFiles: File[]) {
  const accepted = nextFiles.filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
  );

  const firstAccepted = accepted[0];
  if (!firstAccepted) {
    return [];
  }

  if (firstAccepted.type.startsWith("video/")) {
    const firstVideo = accepted.find((file) => file.type.startsWith("video/"));
    return firstVideo ? [firstVideo] : [];
  }

  return accepted.filter((file) => file.type.startsWith("image/"));
}

async function getAuthedClient(apiKeyInput?: string) {
  const apiKey = apiKeyInput?.trim() ?? "";
  if (apiKey.length > 0) {
    return new SegmentationClient({ apiKey });
  }

  const { data: tokenData, error: tokenError } = await authClient.token();
  if (tokenError || !tokenData) {
    throw new Error(tokenError?.message ?? "Failed to authenticate.");
  }

  return new SegmentationClient({ jwt: tokenData.token });
}

async function loadMaskEntries(status: JobStatusResult, userId: string): Promise<LoadedMaskEntry[]> {
  const taskIds =
    status.items
      ?.filter((item) => item.status === JobTaskStatus.Success)
      .map((item) => item.taskId) ?? [];

  if (taskIds.length === 0) {
    return [];
  }

  const fallbackEntries: LoadedMaskEntry[] = taskIds.map((taskId) => ({
    taskId,
    masks: [],
    bakedVideoUrl: null,
  }));
  if (!userId) {
    return fallbackEntries;
  }

  const manifestUrl = buildOutputManifestUrl(userId, status.jobId, resolveOutputFolder(status));

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      return fallbackEntries;
    }

    const manifest = (await response.json()) as unknown;
    return Promise.all(
      taskIds.map(async (taskId) => {
        const context = {
          userId,
          jobId: status.jobId,
          taskId,
        };
        const taskResult = resolveManifestResultForTask(manifest, taskId);

        return {
          taskId,
          masks: normalizeMaskArtifacts(taskResult, context),
          bakedVideoUrl: resolveBakedVideoUrl(taskResult),
        };
      }),
    );
  } catch {
    return fallbackEntries;
  }
}

function resolveBakedVideoUrl(taskResult: unknown): string | null {
  if (!taskResult || typeof taskResult !== "object") {
    return null;
  }

  const typed = taskResult as Record<string, unknown>;
  const direct = typeof typed.bakedVideoUrl === "string" ? typed.bakedVideoUrl : null;

  if (direct && direct.trim().length > 0) {
    return direct.trim();
  }

  const output = typed.output;
  if (!output || typeof output !== "object") {
    return null;
  }

  const typedOutput = output as Record<string, unknown>;
  const nested = typeof typedOutput.bakedVideoUrl === "string" ? typedOutput.bakedVideoUrl : null;

  return nested && nested.trim().length > 0 ? nested.trim() : null;
}

let refreshInFlight = false;
let videoParseGeneration = 0;

export const useStudioStore = create<StudioStore>((set, get) => ({
  ...createInitialState(),

  setUserId: (userId) => {
    set((state) => {
      if (state.userId === userId) {
        return {};
      }

      return createInitialState(userId);
    });
  },

  setApiKey: (apiKey) => {
    set({ apiKey });
  },

  setFiles: async (files) => {
    const normalized = normalizeSelectedFiles(files);
    const fileKind = classifyFiles(normalized);
    const parseGeneration = ++videoParseGeneration;

    const runState =
      fileKind === FileKind.Video
        ? {
            mode: StudioRunMode.Idle as const,
            videoSamplingFps: DEFAULT_VIDEO_SAMPLING_FPS,
          }
        : { mode: StudioRunMode.Idle as const };

    set({
      files: normalized,
      boxes: [],
      videoSourceFps: null,
      videoFpsParseState: fileKind === FileKind.Video ? "parsing" : "idle",
      videoFpsParseError: null,
      runError: null,
      refreshError: null,
      lastRefreshedAt: null,
      runState,
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoBakedUrlByTaskId: {},
      batchCarouselIndex: 0,
      statusRefreshing: false,
      hasAttemptedEmptyPromptSubmit: false,
    });

    if (fileKind !== FileKind.Video) {
      return;
    }

    const videoFile = normalized[0];
    if (!videoFile) {
      return;
    }

    try {
      const parsedFps = await parseVideoSourceFps(videoFile);
      if (parseGeneration !== videoParseGeneration) {
        return;
      }

      const maxFps = Math.max(1, Math.floor(parsedFps));
      set((state) => {
        const nextFps = Math.min(
          maxFps,
          Math.max(1, Math.floor(state.runState.videoSamplingFps ?? DEFAULT_VIDEO_SAMPLING_FPS)),
        );

        return {
          videoSourceFps: parsedFps,
          videoFpsParseState: "ready",
          videoFpsParseError: null,
          runState: {
            ...state.runState,
            videoSamplingFps: nextFps,
          },
        };
      });
    } catch {
      if (parseGeneration !== videoParseGeneration) {
        return;
      }

      set({
        videoSourceFps: null,
        videoFpsParseState: "error",
        videoFpsParseError:
          "Unsupported or unreadable video metadata. Upload a supported MP4 video.",
        runState: {
          mode: StudioRunMode.Idle,
          videoSamplingFps: 1,
        },
      });
    }
  },

  addPromptRow: () => {
    set((state) => ({ promptRows: [...state.promptRows, createPromptRow()] }));
  },

  updatePromptRow: (promptRowId, value) => {
    set((state) => ({
      promptRows: state.promptRows.map((promptRow) =>
        promptRow.id === promptRowId ? { ...promptRow, value } : promptRow,
      ),
    }));
  },

  removePromptRow: (promptRowId) => {
    set((state) => {
      if (state.promptRows.length <= 1) {
        return {};
      }

      return {
        promptRows: state.promptRows.filter((promptRow) => promptRow.id !== promptRowId),
      };
    });
  },

  setHasAttemptedEmptyPromptSubmit: (attempted) => {
    set({ hasAttemptedEmptyPromptSubmit: attempted });
  },

  addBox: (box) => {
    set((state) => ({ boxes: [...state.boxes, box] }));
  },

  clearBoxes: () => {
    set({ boxes: [] });
  },

  setBatchCarouselIndex: (index) => {
    set({ batchCarouselIndex: index });
  },

  setVideoSamplingFps: (fps) => {
    set((state) => ({
      runState: {
        ...state.runState,
        videoSamplingFps: Math.floor(
          Math.min(
            selectVideoFpsRange(state).max ?? Number.POSITIVE_INFINITY,
            Math.max(selectVideoFpsRange(state).min, Number.isFinite(fps) ? Number(fps) : 1),
          ),
        ),
      },
    }));
  },

  resetStudio: () => {
    const userId = get().userId;
    const apiKey = get().apiKey;
    set({ ...createInitialState(userId), apiKey });
  },

  refreshJobStatus: async (jobIdOverride, silent = false) => {
    const targetJobId = jobIdOverride ?? get().runState.jobId;
    if (!targetJobId || refreshInFlight) {
      return;
    }

    refreshInFlight = true;
    if (!silent) {
      set({ statusRefreshing: true });
    }

    try {
      const client = await getAuthedClient(get().apiKey);
      const status = await client.getSegmentJob({ jobId: targetJobId });
      set({
        jobStatus: status,
        refreshError: null,
        lastRefreshedAt: Date.now(),
      });

      const loadedMasks = await loadMaskEntries(status, get().userId);
      if (loadedMasks.length > 0) {
        set((state) => {
          const nextMasks = { ...state.taskMasksByTaskId };
          const nextBakedUrls = { ...state.videoBakedUrlByTaskId };

          for (const entry of loadedMasks) {
            nextMasks[entry.taskId] = entry.masks;
            nextBakedUrls[entry.taskId] = entry.bakedVideoUrl;
          }

          return {
            taskMasksByTaskId: nextMasks,
            videoBakedUrlByTaskId: nextBakedUrls,
          };
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh job status.";
      set({ refreshError: message });
      if (!silent) {
        console.error(error);
      }
    } finally {
      refreshInFlight = false;
      if (!silent) {
        set({ statusRefreshing: false });
      }
    }
  },

  runJob: async () => {
    const state = get();
    if (!selectCanRun(state)) {
      if (selectFileKind(state) === FileKind.Video && state.videoFpsParseState !== "ready") {
        set({
          runError:
            state.videoFpsParseError ??
            "Video metadata is still parsing. Wait for FPS detection before running.",
        });
      }
      return;
    }

    const fileKind = selectFileKind(state);
    const cleanPrompts = selectCleanPrompts(state);
    const selectedVideoFps = state.runState.videoSamplingFps ?? DEFAULT_VIDEO_SAMPLING_FPS;

    set({
      runError: null,
      refreshError: null,
      hasAttemptedEmptyPromptSubmit: false,
      runState: {
        mode: StudioRunMode.Running,
        selectedType: fileKind === FileKind.Video ? "video" : "image_batch",
        ...(fileKind === FileKind.Video
          ? {
              videoSamplingFps: selectedVideoFps,
            }
          : {}),
      },
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoBakedUrlByTaskId: {},
      batchCarouselIndex: 0,
    });

    try {
      const client = await getAuthedClient(state.apiKey);
      let accepted;

      if (fileKind === FileKind.Video) {
        const videoFile = state.files[0];
        if (!videoFile) {
          throw new Error("Please select a video.");
        }
        if (state.videoFpsParseState !== "ready") {
          throw new Error(
            state.videoFpsParseError ??
              "Unsupported or unreadable video metadata. Upload a supported MP4 video.",
          );
        }
        if (!selectHasValidVideoSamplingFps(state)) {
          throw new Error("Video FPS must be within 1 and the source video FPS.");
        }

        accepted = await client.segmentVideo({
          file: videoFile,
          frameIdx: 0,
          fps: selectedVideoFps,
          prompts: cleanPrompts,
          videoOutputMode: "frames_and_video",
        });
      } else {
        accepted = await client.uploadAndCreateJob(
          {
            type: "image_batch",
            prompts: cleanPrompts,
            boxes:
              state.boxes.length > 0
                ? state.boxes.map((coordinates) => ({
                    coordinates: [coordinates[0], coordinates[1], coordinates[2], coordinates[3]],
                    isPositive: true,
                  }))
                : undefined,
            threshold: 0.5,
            maskThreshold: 0.5,
            files: selectImageFiles(state).map((file) => ({
              data: file,
              contentType: file.type || "image/png",
            })),
          },
          (done, total) => {
            set({ uploadProgress: { done, total } });
          },
        );
      }

      set({
        runState: {
          mode: StudioRunMode.Ready,
          selectedType: fileKind === FileKind.Video ? "video" : "image_batch",
          jobId: accepted.jobId,
          ...(fileKind === FileKind.Video
            ? {
                videoSamplingFps: selectedVideoFps,
              }
            : {}),
        },
        uploadProgress: INITIAL_UPLOAD_PROGRESS,
      });

      await get().refreshJobStatus(accepted.jobId, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start job.";
      set({
        runError: message,
        runState: { mode: StudioRunMode.Idle },
        uploadProgress: INITIAL_UPLOAD_PROGRESS,
      });
    }
  },
}));
