import type * as z from "zod/mini";
import type {
  JobListItemResponseSchema,
  JobListResponseSchema,
  JobSummaryStatusSchema,
} from "./schemas";

export type JobType = "image" | "video";

export type JobTaskStatus = "queued" | "processing" | "success" | "failed";
export type JobSummaryStatus = z.infer<typeof JobSummaryStatusSchema>;

export interface JobRequest {
  readonly type: JobType;
  readonly tasks: string[];
  readonly prompts?: string[];
  readonly generatePreview?: boolean;
  readonly fps?: number;
  readonly threshold?: number;
  readonly maskThreshold?: number;
}

export interface JobResponse {
  readonly jobId: string;
  readonly type: JobType;
  readonly totalItems: number;
}

export interface AccountResponse {
  readonly accountId: string;
}

export interface JobTaskResult {
  readonly taskId: string;
  readonly status: JobTaskStatus;
  readonly error?: string;
}

export interface JobStatusResponse {
  readonly userId: string;
  readonly jobId: string;
  readonly type: JobType;
  readonly tasks: JobTaskResult[];
}

export interface TaskStatus extends JobTaskResult {
  readonly url: string;
}

export interface JobStatus {
  readonly userId: string;
  readonly jobId: string;
  readonly type: JobType;
  readonly tasks: TaskStatus[];
}

export type JobDownloadStatus = "pending" | "processing" | "ready" | "failed";

export interface JobDownload {
  readonly jobId: string;
  readonly status: JobDownloadStatus;
  readonly expiresAt: string | null;
  readonly downloadUrl: string | null;
  readonly retryAfterSeconds: number | null;
  readonly error: string | null;
}

export interface ListJobsParams {
  readonly limit?: number;
  readonly nextToken?: string;
}

export type JobListItemResponse = z.infer<typeof JobListItemResponseSchema>;

export type JobListResponse = z.infer<typeof JobListResponseSchema>;

export interface ImageOutputMask {
  readonly maskIndex: number;
  readonly confidence?: number | null;
  readonly url: string;
}

export interface BaseOutputManifestItem {
  readonly taskId: string;
  readonly inputId: string;
  readonly units: number;
  readonly generatedAt: string;
  readonly previewUrl?: string | null;
}

export interface ImageOutputManifestItem extends BaseOutputManifestItem {
  readonly masks: ImageOutputMask[];
}

export interface BaseOutputManifest {
  readonly accountId: string;
  readonly jobId: string;
  readonly prompts: string[];
}

export interface ImageOutputManifest extends BaseOutputManifest {
  readonly type: "image";
  readonly items: ImageOutputManifestItem[];
}

export interface VideoOutputCounts {
  readonly [key: string]: number;
}

export interface VideoOutputManifestItem extends BaseOutputManifestItem {
  readonly fps?: number;
  readonly numFrames?: number;
  readonly maxFrames?: number;
  readonly scoreThreshold?: number;
  readonly counts?: VideoOutputCounts;
  readonly masks: string;
}

export interface VideoOutputManifest extends BaseOutputManifest {
  readonly type: "video";
  readonly items: VideoOutputManifestItem[];
}

export type OutputManifest = ImageOutputManifest | VideoOutputManifest;

export type PresignContentType = "image/jpeg" | "image/png" | "image/webp" | "video/mp4";

export interface PresignRequest {
  readonly contentType: PresignContentType;
}

export interface PresignResponse {
  readonly uploadUrl: string;
  readonly taskId: string;
  readonly expiresIn: number;
}

