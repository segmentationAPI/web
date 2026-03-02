import { create } from "zustand";
import {
  JobTaskStatus,
  SegmentationClient,
  buildOutputManifestUrl,
  loadVideoFrameMasks,
  normalizeMaskArtifacts,
  resolveManifestResultForTask,
  resolveOutputFolder,
  type JobStatusResult,
  type MaskArtifactResult,
  type VideoFrameMaskMap,
} from "@segmentationapi/sdk";

import { authClient } from "@/lib/auth-client";

import type { BoxCoordinates } from "../_components/studio-canvas-types";
import {
  FileKind,
  StudioRunMode,
  selectCanRun,
  selectCleanPrompts,
  selectFileKind,
  selectImageFiles,
  type StudioSelectorState,
} from "./studio-selectors";

type UploadProgress = { done: number; total: number };

type LoadedMaskEntry = {
  taskId: string;
  masks: MaskArtifactResult[];
  frameMasks: VideoFrameMaskMap;
};

type StudioState = StudioSelectorState & {
  userId: string;
  uploadProgress: UploadProgress;
  statusRefreshing: boolean;
  batchCarouselIndex: number;
};

type StudioActions = {
  setUserId: (userId: string) => void;
  setFiles: (files: File[]) => void;
  setPrompts: (prompts: string[]) => void;
  addBox: (box: BoxCoordinates) => void;
  clearBoxes: () => void;
  setBatchCarouselIndex: (index: number) => void;
  resetStudio: () => void;
  refreshJobStatus: (jobIdOverride?: string, silent?: boolean) => Promise<void>;
  runJob: () => Promise<void>;
};

type StudioStore = StudioState & StudioActions;

const INITIAL_UPLOAD_PROGRESS: UploadProgress = { done: 0, total: 0 };

function createInitialState(userId = ""): StudioState {
  return {
    userId,
    files: [],
    prompts: [""],
    boxes: [],
    runState: { mode: StudioRunMode.Idle },
    uploadProgress: INITIAL_UPLOAD_PROGRESS,
    jobStatus: null,
    taskMasksByTaskId: {},
    videoFrameMasksByTaskId: {},
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

async function getAuthedClient() {
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
    frameMasks: {},
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
          frameMasks: await loadVideoFrameMasks(taskResult, context),
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

  setFiles: (files) => {
    const normalized = normalizeSelectedFiles(files);
    set({
      files: normalized,
      boxes: [],
      runState: { mode: StudioRunMode.Idle },
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoFrameMasksByTaskId: {},
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

  resetStudio: () => {
    const userId = get().userId;
    set(createInitialState(userId));
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
      const client = await getAuthedClient();
      const status = await client.getSegmentJob({ jobId: targetJobId });
      set({ jobStatus: status });

      const loadedMasks = await loadMaskEntries(status, get().userId);
      if (loadedMasks.length > 0) {
        set((state) => {
          const nextMasks = { ...state.taskMasksByTaskId };
          const nextFrameMasks = { ...state.videoFrameMasksByTaskId };

          for (const entry of loadedMasks) {
            nextMasks[entry.taskId] = entry.masks;
            nextFrameMasks[entry.taskId] = entry.frameMasks;
          }

          return {
            taskMasksByTaskId: nextMasks,
            videoFrameMasksByTaskId: nextFrameMasks,
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

    set({
      runState: {
        mode: StudioRunMode.Running,
        selectedType: fileKind === FileKind.Video ? "video" : "image_batch",
      },
      uploadProgress: INITIAL_UPLOAD_PROGRESS,
      jobStatus: null,
      taskMasksByTaskId: {},
      videoFrameMasksByTaskId: {},
      batchCarouselIndex: 0,
    });

    try {
      const client = await getAuthedClient();
      let accepted;

      if (fileKind === FileKind.Video) {
        const videoFile = state.files[0];
        if (!videoFile) {
          throw new Error("Please select a video.");
        }

        accepted = await client.segmentVideo({
          file: videoFile,
          frameIdx: 0,
          fps: 2,
          maxFrames: 120,
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
