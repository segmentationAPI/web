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

type StudioDisabledState = {
  hasBillingBlock: boolean;
  hasActiveApiKey: boolean;
  hasInputs: boolean;
  hasPrompts: boolean;
  isRunning: boolean;
};

export function sanitizeStudioPrompts(prompts: readonly string[]) {
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0);
}

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

export function getStudioStatusDescription(summary: StudioTaskSummary) {
  if (summary.status === "completed") {
    if (summary.failedItems > 0) {
      return `${summary.succeededItems} completed, ${summary.failedItems} failed. Review the preview or download artifacts.`;
    }

    return summary.totalItems > 0
      ? `${summary.succeededItems} ${summary.succeededItems === 1 ? "item is" : "items are"} ready to review or download.`
      : "Job finished. Refresh preview if outputs are not visible yet.";
  }

  if (summary.status === "failed") {
    return "Every task in this job failed. Refresh for the latest status or submit again after fixing the inputs.";
  }

  if (summary.status === "processing") {
    return `${summary.runningItems} ${summary.runningItems === 1 ? "item is" : "items are"} processing${
      summary.queuedItems > 0
        ? `, ${summary.queuedItems} ${summary.queuedItems === 1 ? "item remains" : "items remain"} queued`
        : ""
    }.`;
  }

  if (summary.status === "queued") {
    return summary.totalItems > 0
      ? `${summary.totalItems} ${summary.totalItems === 1 ? "item is" : "items are"} queued. Refresh preview to check for progress.`
      : "Your job has been queued. Refresh preview to check for progress.";
  }

  return "Upload media and add at least one prompt to run a studio job.";
}

export function getStudioRunDisabledReason(state: StudioDisabledState) {
  if (state.hasBillingBlock || !state.hasActiveApiKey) {
    return null;
  }

  if (!state.hasInputs && !state.hasPrompts) {
    return "Add media and at least one prompt before submitting a job.";
  }

  if (!state.hasInputs) {
    return "Add at least one image or video before submitting a job.";
  }

  if (!state.hasPrompts) {
    return "Add at least one non-empty prompt before submitting a job.";
  }

  if (state.isRunning) {
    return "This job is still running. Refresh preview to check progress before starting another run.";
  }

  return null;
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

export function getStudioActionErrorMessage(
  action: "submit" | "refresh" | "download",
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "";

  if (action === "submit") {
    if (message.startsWith("Unsupported file type:")) {
      return "That file type is not supported. Upload JPG, PNG, WEBP, or MP4 files.";
    }

    if (message === "Video jobs require exactly one uploaded input") {
      return "Video jobs can only include one uploaded file.";
    }

    if (message === "At least one uploaded input is required") {
      return "Add media before submitting a job.";
    }

    if (message.startsWith("Upload failed:")) {
      return "One of your files failed to upload. Try submitting again.";
    }

    if (message.startsWith("Missing taskId") || message.startsWith("Missing uploadUrl")) {
      return "The upload session expired before submission completed. Try running the job again.";
    }

    if (message === "HTTP 429" || message === "HTTP 503") {
      return "The playground is busy right now. Try again in a moment.";
    }

    return "Failed to submit the job. Try again.";
  }

  if (action === "refresh") {
    return "Failed to refresh the latest job status. Try again.";
  }

  if (message === "download_timeout") {
    return "Artifacts are still being prepared. Try downloading again in a moment.";
  }

  if (message === "download_failed") {
    return "Artifacts could not be prepared for this job.";
  }

  return "Failed to prepare the download. Try again.";
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
  fps?: number,
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
      fps,
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
