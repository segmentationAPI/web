import { create } from "zustand";
import {
  JobTaskStatus,
  SegmentationClient,
  buildOutputManifestUrl,
  loadVideoMaskTimeline,
  normalizeMaskArtifacts,
  resolveManifestResultForTask,
  resolveOutputFolder,
  type JobStatusResult,
  type MaskArtifactResult,
  type VideoMaskTimeline,
} from "@segmentationapi/sdk";

import { authClient } from "@/lib/auth-client";

import type { BoxCoordinates } from "../_components/studio-canvas-types";
import {
  DEFAULT_VIDEO_PREVIEW_MODE,
  DEFAULT_VIDEO_SAMPLING_FPS,
  FileKind,
  StudioRunMode,
  classifyFiles,
  selectCanRun,
  selectCleanPrompts,
  selectFileKind,
  selectHasValidVideoSamplingFps,
  selectImageFiles,
  type VideoPreviewMode,
  type StudioSelectorState,
} from "./studio-selectors";

type UploadProgress = { done: number; total: number };

type LoadedMaskEntry = {
  taskId: string;
  masks: MaskArtifactResult[];
  timeline: VideoMaskTimeline;
};

type StudioState = StudioSelectorState & {
  userId: string;
  apiKey: string;
  uploadProgress: UploadProgress;
  statusRefreshing: boolean;
  batchCarouselIndex: number;
};

type StudioActions = {
  setUserId: (userId: string) => void;
  setApiKey: (apiKey: string) => void;
  setFiles: (files: File[]) => void;
  setPrompts: (prompts: string[]) => void;
  addBox: (box: BoxCoordinates) => void;
  clearBoxes: () => void;
  setBatchCarouselIndex: (index: number) => void;
  setVideoSamplingFps: (fps: number) => void;
  setVideoPreviewMode: (mode: VideoPreviewMode) => void;
  resetStudio: () => void;
  refreshJobStatus: (jobIdOverride?: string, silent?: boolean) => Promise<void>;
  runJob: () => Promise<void>;
};

type StudioStore = StudioState & StudioActions;

const INITIAL_UPLOAD_PROGRESS: UploadProgress = { done: 0, total: 0 };
function createInitialState(userId = ""): StudioState {
  return {
    userId,
    apiKey: "",
    files: [],
    prompts: [""],
    boxes: [],
    runState: { mode: StudioRunMode.Idle },
    uploadProgress: INITIAL_UPLOAD_PROGRESS,
    jobStatus: null,
    taskMasksByTaskId: {},
    videoTimelineByTaskId: {},
    statusRefreshing: false,
    batchCarouselIndex: 0,
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
    timeline: { frames: [] },
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
          timeline: await loadVideoMaskTimeline(taskResult, context),
        };
      }),
    );
  } catch {
    return fallbackEntries;
  }
}

let refreshInFlight = false;

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

  setFiles: (files) => {
    const normalized = normalizeSelectedFiles(files);
    const fileKind = classifyFiles(normalized);

    const runState =
      fileKind === FileKind.Video
        ? {
            mode: StudioRunMode.Idle as const,
            videoSamplingFps: DEFAULT_VIDEO_SAMPLING_FPS,
            videoPreviewMode: DEFAULT_VIDEO_PREVIEW_MODE,
          }
        : { mode: StudioRunMode.Idle as const };

    set({
      files: normalized,
      boxes: [],
      runState,
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoTimelineByTaskId: {},
      batchCarouselIndex: 0,
      statusRefreshing: false,
    });
  },

  setPrompts: (prompts) => {
    set({ prompts: prompts.length > 0 ? prompts : [""] });
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
        videoSamplingFps: fps,
      },
    }));
  },

  setVideoPreviewMode: (mode) => {
    set((state) => ({
      runState: {
        ...state.runState,
        videoPreviewMode: mode,
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
      set({ jobStatus: status });

      const loadedMasks = await loadMaskEntries(status, get().userId);
      if (loadedMasks.length > 0) {
        set((state) => {
          const nextMasks = { ...state.taskMasksByTaskId };
          const nextTimelines = { ...state.videoTimelineByTaskId };

          for (const entry of loadedMasks) {
            nextMasks[entry.taskId] = entry.masks;
            nextTimelines[entry.taskId] = entry.timeline;
          }

          return {
            taskMasksByTaskId: nextMasks,
            videoTimelineByTaskId: nextTimelines,
          };
        });
      }
    } catch (error) {
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
      return;
    }

    const fileKind = selectFileKind(state);
    const cleanPrompts = selectCleanPrompts(state);
    const selectedVideoFps = state.runState.videoSamplingFps ?? DEFAULT_VIDEO_SAMPLING_FPS;

    set({
      runState: {
        mode: StudioRunMode.Running,
        selectedType: fileKind === FileKind.Video ? "video" : "image_batch",
        ...(fileKind === FileKind.Video
          ? {
              videoSamplingFps: selectedVideoFps,
              videoPreviewMode: state.runState.videoPreviewMode ?? DEFAULT_VIDEO_PREVIEW_MODE,
            }
          : {}),
      },
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoTimelineByTaskId: {},
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
        if (!selectHasValidVideoSamplingFps(state)) {
          throw new Error("Video FPS must be a whole number greater than or equal to 1.");
        }

        accepted = await client.segmentVideo({
          file: videoFile,
          frameIdx: 0,
          fps: selectedVideoFps,
          prompts: cleanPrompts,
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
                videoPreviewMode: state.runState.videoPreviewMode ?? DEFAULT_VIDEO_PREVIEW_MODE,
              }
            : {}),
        },
        uploadProgress: INITIAL_UPLOAD_PROGRESS,
      });

      await get().refreshJobStatus(accepted.jobId, true);
    } catch {
      set({
        runState: { mode: StudioRunMode.Idle },
        uploadProgress: INITIAL_UPLOAD_PROGRESS,
      });
    }
  },
}));
