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

type StudioTaskSummary = {
  failedItems: number;
  queuedItems: number;
  runningItems: number;
  status: StudioRunStatus;
  succeededItems: number;
  totalItems: number;
};

export function deriveStudioInputType(tasks: readonly Pick<SubmitInputTask, "file">[]) {
  if (tasks.length === 0) {
    return null;
  }

  return tasks.every((task) => task.file.type.startsWith("image/")) ? "image" : "video";
}

export function isStudioJobRunning(status: StudioRunStatus) {
  return status === "queued" || status === "processing";
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

  if (status === "processing") {
    return { label: "Processing", tone: "neutral" };
  }

  return { label: "Ready", tone: "neutral" };
}

function summarizeTaskStatuses(tasks: JobStatus["tasks"]): StudioTaskSummary {
  const totalItems = tasks.length;
  const queuedItems = tasks.filter((task) => task.status === "queued").length;
  const runningItems = tasks.filter((task) => task.status === "processing").length;
  const failedItems = tasks.filter((task) => task.status === "failed").length;
  const succeededItems = tasks.filter((task) => task.status === "success").length;

  let status: StudioRunStatus;
  if (totalItems === 0) {
    status = "queued";
  } else if (failedItems === totalItems) {
    status = "failed";
  } else if (succeededItems + failedItems === totalItems) {
    status = "completed";
  } else if (runningItems > 0) {
    status = "processing";
  } else {
    status = queuedItems === totalItems ? "queued" : "processing";
  }

  return {
    failedItems,
    queuedItems,
    runningItems,
    status,
    succeededItems,
    totalItems,
  };
}

export function summarizeJobStatus(jobStatus: JobStatus) {
  return summarizeTaskStatuses(jobStatus.tasks);
}

export function deriveStudioRunStatus(jobStatus: JobStatus): StudioRunStatus {
  return summarizeTaskStatuses(jobStatus.tasks).status;
}

export function hasTerminalStudioItems(jobStatus: JobStatus) {
  return jobStatus.tasks.every((item) => item.status === "success" || item.status === "failed");
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

export function buildStudioJobRequest(
  tasks: readonly PreparedTask[],
  prompts: string[],
): JobRequest {
  const requestType = deriveStudioInputType(tasks);

  if (requestType === "video") {
    if (tasks.length !== 1) {
      throw new Error("Video jobs require exactly one uploaded input");
    }

    return {
      type: "video",
      tasks: [tasks[0].taskId],
      prompts,
      generatePreview: true,
    };
  }

  if (requestType === "image") {
    return {
      type: "image",
      tasks: tasks.map((task) => task.taskId),
      prompts,
      generatePreview: true,
    };
  }

  throw new Error("At least one uploaded input is required");
}
