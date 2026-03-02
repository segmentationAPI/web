export type BinaryData = Blob | File | Uint8Array;

export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ApiKeyAuth = {
  apiKey: string;
  jwt?: never;
};

type JwtAuth = {
  jwt: string;
  apiKey?: never;
};

export type SegmentationClientOptions = (ApiKeyAuth | JwtAuth) & {
  fetch?: FetchFunction;
};

export interface CreatePresignedUploadRequest {
  contentType: string;
  signal?: AbortSignal;
}

export type SegmentVideoPrompts = {
  prompts: string[];
};

export type SegmentVideoSamplingByFps = {
  fps: number;
  numFrames?: never;
};

export type SegmentVideoSamplingByFrameCount = {
  fps?: never;
  numFrames: number;
};

export type SegmentVideoSamplingDefault = {
  fps?: never;
  numFrames?: never;
};

export type SegmentVideoRequest = SegmentVideoPrompts &
  (SegmentVideoSamplingByFps | SegmentVideoSamplingByFrameCount | SegmentVideoSamplingDefault) & {
    file: BinaryData;
    maxFrames?: number;
    frameIdx?: number;
    signal?: AbortSignal;
  };

export interface BatchSegmentItemInput {
  taskId: string;
}

export interface ImageBoxPrompt {
  coordinates: [number, number, number, number];
  isPositive: boolean;
  objectId?: string;
}

export type JobType = "image_batch" | "video";

export interface CreateJobRequest {
  type: JobType;
  prompts?: string[];
  boxes?: ImageBoxPrompt[];
  points?: Array<{
    coordinates: [number, number];
    isPositive: boolean;
    objectId?: string;
  }>;
  threshold?: number;
  maskThreshold?: number;
  items: BatchSegmentItemInput[];
  signal?: AbortSignal;
}

export interface GetSegmentJobRequest {
  jobId: string;
  signal?: AbortSignal;
}

export interface UploadImageRequest {
  uploadUrl: string;
  data: BinaryData;
  contentType?: string;
  signal?: AbortSignal;
}

export interface UploadAndCreateJobRequest {
  type: JobType;
  prompts?: string[];
  boxes?: ImageBoxPrompt[];
  points?: Array<{
    coordinates: [number, number];
    isPositive: boolean;
    objectId?: string;
  }>;
  files: Array<{
    data: BinaryData;
    contentType: string;
  }>;
  threshold?: number;
  maskThreshold?: number;
  signal?: AbortSignal;
}

export interface PresignedUploadRaw {
  uploadUrl: string;
  taskId: string;
  bucket: string;
  expiresIn: number;
}

export type JobAcceptedType = "image_batch" | "video";
export type JobRequestStatus =
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";
export type JobTaskStatus = "queued" | "running" | "success" | "failed";

export interface JobAcceptedRaw {
  requestId?: string;
  jobId: string;
  type: JobAcceptedType;
  status: "queued";
  totalItems: number;
}

export interface MaskResultRaw {
  key: string;
  score?: number | null;
  box?: number[] | null;
}

export interface MaskArtifactContext {
  userId: string;
  jobId: string;
  taskId: string;
}

export interface MaskArtifactResult {
  maskIndex: number;
  key: string;
  url: string;
  score: number | null;
  box: [number, number, number, number] | null;
}

export type VideoFrameMaskMap = Record<number, MaskArtifactResult[]>;

export interface VideoOutputRaw {
  requestId: string;
  status: string;
  submittedAt: string;
  completedAt: string;
  input: any;
  counts: any;
  output: string;
  summary: any;
}

export interface JobStatusItemRaw {
  taskId: string;
  status: JobTaskStatus;
  error?: string | null;
}

export interface JobStatusRaw {
  requestId?: string;
  jobId: string;
  type: JobType;
  status: JobRequestStatus;
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  accountId?: string;
  outputFolder?: string;
  inputs?: string[];
  items?: JobStatusItemRaw[];
  error?: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  taskId: string;
  bucket: string;
  expiresIn: number;
  raw: PresignedUploadRaw;
}

export interface MaskResult {
  key: string;
  score?: number;
  box?: number[];
  url: string;
}

export interface JobAcceptedResult {
  requestId: string;
  jobId: string;
  type: JobAcceptedType;
  status: "queued";
  totalItems: number;
  raw: JobAcceptedRaw;
}

export interface JobStatusItem {
  taskId: string;
  status: JobTaskStatus;
  error?: string;
}

export interface JobStatusResult {
  requestId: string;
  jobId: string;
  type: JobType;
  status: JobRequestStatus;
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  items?: JobStatusItem[];
  error?: string;
  raw: JobStatusRaw;
}

export type ResponseBody = Record<string, unknown> | string | null;
