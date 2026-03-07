import { create } from "zustand";
import type { JobStatus } from "@segmentationapi/sdk";
import { parseVideoSourceFps } from "../../../lib/video-fps-parser";
import { deriveStudioInputType, deriveStudioRunStatus, summarizeJobStatus } from "../utils";
import type { StudioRunStatus } from "../types";

interface InputTask {
  file: File;
  uploadUrl: string | undefined;
  taskId: string | undefined;
}

interface StudioState {
  prompts: string[];
  inputTasks: InputTask[];
  fps: number;
  maxFps: number;
  outputLinks: string[];
  jobId: string;
  status: StudioRunStatus;
  totalItems: number;
  queuedItems: number;
  runningItems: number;
  succeededItems: number;
  failedItems: number;
}

interface StudioActions {
  addPrompt: () => void;
  setPrompt: (index: number, value: string) => void;
  removePrompt: (index: number) => void;
  addFiles: (file: FileList) => void;
  removeFile: (index: number) => void;
  setFps: (fps: number) => void;
  setJobId: (jobId: string) => void;
  setJobStatus: (status: StudioRunStatus) => void;
  setTotalItems: (totalItems: number) => void;
  refreshOutput: (jobStatus: JobStatus) => void;
  updateInputTask: (index: number, taskId: string, uploadUrl: string) => void;
  setOutputLinks: (outputLinks: string[]) => void;
}

export const studioRequestStore = create<StudioState & StudioActions>()((set, get) => ({
  prompts: [],
  inputTasks: [],
  fps: 0,
  maxFps: 0,
  outputLinks: [],
  jobId: "",
  status: "idle",
  setJobStatus: (status: StudioRunStatus) => set((_) => ({ status })),
  totalItems: 0,
  setTotalItems: (totalItems: number) => set((_) => ({ totalItems })),
  queuedItems: 0,
  runningItems: 0,
  succeededItems: 0,
  failedItems: 0,
  addPrompt: () => set((state) => ({ prompts: [...state.prompts, ""] })),
  setPrompt: (index: number, value: string) =>
    set((state) => ({ prompts: state.prompts.map((prompt, i) => (i === index ? value : prompt)) })),
  removePrompt: (index: number) =>
    set((state) => ({ prompts: state.prompts.filter((_, i) => i !== index) })),
  addFiles: async (files: FileList) => {
    let nextTasks = get().inputTasks;

    for (const file of files) {
      const currentType = deriveStudioInputType(nextTasks);

      if (currentType === "image" && !file.type.startsWith("image/")) return;
      if (currentType === "video" && !file.type.startsWith("video/")) return;

      const newTask: InputTask = { file, uploadUrl: undefined, taskId: undefined };
      nextTasks = [...nextTasks, newTask];

      set((_) => ({ inputTasks: nextTasks }));

      if (deriveStudioInputType(nextTasks) === "video") {
        const videoFps = await parseVideoSourceFps(file);
        set((state) => ({
          fps: state.fps > 0 ? Math.min(state.fps, videoFps) : videoFps,
          maxFps: videoFps,
        }));
      }
    }
  },
  removeFile: (index: number) =>
    set((state) => ({ inputTasks: state.inputTasks.filter((_, i) => i !== index) })),
  setFps: (fps: number) => set((_) => ({ fps })),
  setJobId: (jobId: string) => set((_) => ({ jobId, outputLinks: [] })),
  refreshOutput: (jobStatus: JobStatus) => {
    const summary = summarizeJobStatus(jobStatus);

    set((_) => ({
      ...summary,
      status: deriveStudioRunStatus(jobStatus),
    }));
  },
  updateInputTask: (index: number, taskId: string, uploadUrl: string) =>
    set((_) => ({
      inputTasks: get().inputTasks.map((task, i) =>
        i === index ? { ...task, taskId, uploadUrl } : task,
      ),
    })),
  setOutputLinks: (outputLinks: string[]) => set((_) => ({ outputLinks })),
}));

export const usePrompts = () => studioRequestStore((state) => state.prompts);
export const useAddPrompt = () => studioRequestStore((state) => state.addPrompt);
export const useSetPrompt = () => studioRequestStore((state) => state.setPrompt);
export const useRemovePrompt = () => studioRequestStore((state) => state.removePrompt);

export const useInputTasks = () => studioRequestStore((state) => state.inputTasks);
export const useAddFiles = () => studioRequestStore((state) => state.addFiles);
export const useRemoveFile = () => studioRequestStore((state) => state.removeFile);

export const useInputType = () => studioRequestStore((state) => deriveStudioInputType(state.inputTasks));

export const useFps = () => studioRequestStore((state) => state.fps);
export const useMaxFps = () => studioRequestStore((state) => state.maxFps);
export const useSetFps = () => studioRequestStore((state) => state.setFps);

export const useIsValidInput = () =>
  studioRequestStore((state) => state.inputTasks.length > 0 && state.prompts.length > 0);

export const useOutputLinks = () => studioRequestStore((state) => state.outputLinks);
export const useJobId = () => studioRequestStore((state) => state.jobId);
export const useSetJobId = () => studioRequestStore((state) => state.setJobId);
export const useStatus = () => studioRequestStore((state) => state.status);
export const useSetJobStatus = () => studioRequestStore((state) => state.setJobStatus);
export const useTotalItems = () => studioRequestStore((state) => state.totalItems);
export const useSetTotalItems = () => studioRequestStore((state) => state.setTotalItems);
export const useSucceededItems = () => studioRequestStore((state) => state.succeededItems);
export const useFailedItems = () => studioRequestStore((state) => state.failedItems);
export const useRefreshOutput = () => studioRequestStore((state) => state.refreshOutput);
export const useUpdateInputTask = () => studioRequestStore((state) => state.updateInputTask);
export const useSetOutputLinks = () => studioRequestStore((state) => state.setOutputLinks);
