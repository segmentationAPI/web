export type JobType = "image" | "video";

export type JobQueueStatus = "queued";

export type JobTaskStatus = "queued" | "running" | "success" | "failed";

export type JobSummaryStatus =
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface JobRequest {
  readonly type: JobType;
  readonly tasks: string[];
  readonly prompts?: string[];
  readonly generatePreview?: boolean;
  readonly threshold?: number;
  readonly maskThreshold?: number;
}

export interface JobResponse {
  readonly jobId: string;
  readonly type: JobType;
  readonly status: JobQueueStatus;
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

export interface ListJobsParams {
  readonly limit?: number;
  readonly nextToken?: string;
}

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
