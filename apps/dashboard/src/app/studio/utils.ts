import type { JobRequest, JobStatus, PresignRequest } from "@segmentationapi/sdk";

import type { StudioRunStatus } from "./types";

type SubmitInputTask = {
  file: File;
  uploadUrl?: string;
  taskId?: string;
};

type PreparedTask = {
  file: File;
  uploadUrl: string;
  taskId: string;
};

export function deriveStudioInputType(tasks: readonly Pick<SubmitInputTask, "file">[]) {
  if (tasks.length === 0) {
    return null;
  }

  return tasks.every((task) => task.file.type.startsWith("image/")) ? "image" : "video";
}

export function isStudioJobRunning(status: StudioRunStatus) {
  return status === "queued" || status === "running";
}

export function getStudioStatusMeta(status: StudioRunStatus): {
  label: string;
  tone: "danger" | "neutral" | "success";
} {
  if (status === "failed") {
    return { label: "Failed", tone: "danger" };
  }

  if (status === "completed") {
    return { label: "Completed", tone: "success" };
  }

  if (status === "queued") {
    return { label: "Queued", tone: "neutral" };
  }

  if (status === "running") {
    return { label: "Running", tone: "neutral" };
  }

  return { label: "Ready", tone: "neutral" };
}

export function summarizeJobStatus(jobStatus: JobStatus) {
  const totalItems = jobStatus.items.length;
  const queuedItems = jobStatus.items.filter((item) => item.status === "queued").length;
  const runningItems = jobStatus.items.filter((item) => item.status === "running").length;
  const failedItems = jobStatus.items.filter((item) => item.status === "failed").length;
  const succeededItems = jobStatus.items.filter((item) => item.status === "success").length;

  return {
    failedItems,
    queuedItems,
    runningItems,
    succeededItems,
    totalItems,
  };
}

export function deriveStudioRunStatus(jobStatus: JobStatus): StudioRunStatus {
  const { failedItems, queuedItems, runningItems, succeededItems, totalItems } = summarizeJobStatus(jobStatus);

  if (totalItems === 0) {
    return "queued";
  }

  if (failedItems === totalItems) {
    return "failed";
  }

  if (succeededItems + failedItems === totalItems) {
    return "completed";
  }

  if (runningItems > 0) {
    return "running";
  }

  return queuedItems === totalItems ? "queued" : "running";
}

export function hasTerminalStudioItems(jobStatus: JobStatus) {
  return jobStatus.items.every((item) => item.status === "success" || item.status === "failed");
}

export function extractManifestPreviewUrls(previewUrls: Array<string | null | undefined>) {
  return previewUrls.filter((previewUrl): previewUrl is string => Boolean(previewUrl));
}

export function toSupportedContentType(file: File): PresignRequest["contentType"] {
  switch (file.type) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
    case "video/mp4":
      return file.type;
    default:
      throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
}

export function ensurePreparedTasks(tasks: readonly SubmitInputTask[]): PreparedTask[] {
  return tasks.map((task, index) => {
    if (!task.taskId) {
      throw new Error(`Missing taskId for input ${index + 1}`);
    }

    if (!task.uploadUrl) {
      throw new Error(`Missing uploadUrl for input ${index + 1}`);
    }

    return {
      file: task.file,
      taskId: task.taskId,
      uploadUrl: task.uploadUrl,
    };
  });
}

export function buildStudioJobRequest(tasks: readonly PreparedTask[], prompts: string[]): JobRequest {
  const requestType = deriveStudioInputType(tasks);

  if (requestType === "video") {
    if (tasks.length !== 1) {
      throw new Error("Video jobs require exactly one uploaded input");
    }

    return {
      type: "video",
      items: [tasks[0].taskId],
      prompts,
      generatePreview: true,
    };
  }

  if (requestType === "image") {
    return {
      type: "image",
      items: tasks.map((task) => task.taskId),
      prompts,
      generatePreview: true,
    };
  }

  throw new Error("At least one uploaded input is required");
}
