import { ASSETS_BASE_URL } from "../constants";
import type { JobStatus, JobStatusResponse } from "../types";

export function toJobStatus(jobStatusResponse: JobStatusResponse): JobStatus {
  return {
    userId: jobStatusResponse.userId,
    jobId: jobStatusResponse.jobId,
    type: jobStatusResponse.type,
    items: jobStatusResponse.items.map((item) => ({
      taskId: item.taskId,
      status: item.status,
      error: item.error,
      url: `${ASSETS_BASE_URL}/outputs/${jobStatusResponse.userId}/${jobStatusResponse.jobId}/${item.taskId}`,
    })),
  };
}
