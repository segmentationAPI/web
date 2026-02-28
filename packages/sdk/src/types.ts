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

export interface SegmentRequest {
  prompts?: string[];
  boxes?: number[][];
  boxLabels?: number[];
  inputS3Key: string;
  threshold?: number;
  maskThreshold?: number;
  signal?: AbortSignal;
}

export type SegmentVideoPoint = [number, number];
export type SegmentVideoBox = [number, number, number, number];
export type SegmentVideoObjectId = number | string;

export type SegmentVideoPointsPrompt = {
  points: SegmentVideoPoint[];
  pointLabels?: number[];
  pointObjectIds?: SegmentVideoObjectId[];
  boxes?: never;
  boxObjectIds?: never;
};

export type SegmentVideoBoxesPrompt = {
  boxes: SegmentVideoBox[];
  boxObjectIds?: SegmentVideoObjectId[];
  points?: never;
  pointLabels?: never;
  pointObjectIds?: never;
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

export type SegmentVideoRequest = (SegmentVideoPointsPrompt | SegmentVideoBoxesPrompt) &
  (SegmentVideoSamplingByFps | SegmentVideoSamplingByFrameCount | SegmentVideoSamplingDefault) & {
    file: BinaryData;
    maxFrames?: number;
    frameIdx?: number;
    signal?: AbortSignal;
  };

export interface BatchSegmentItemInput {
  inputS3Key: string;
}

export interface CreateBatchSegmentJobRequest {
  prompts?: string[];
  boxes?: number[][];
  boxLabels?: number[];
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

export interface UploadAndSegmentRequest {
  prompts?: string[];
  boxes?: number[][];
  boxLabels?: number[];
  data: BinaryData;
  contentType: string;
  threshold?: number;
  maskThreshold?: number;
  signal?: AbortSignal;
}

export interface PresignedUploadRaw {
  uploadUrl: string;
  inputS3Key: string;
  bucket: string;
  expiresIn: number;
}

export interface SegmentMaskRaw {
  key: string;
  score: number;
  box: number[];
}

export interface SegmentResponseRaw {
  requestId?: string;
  jobId: string;
  numInstances: number;
  outputPrefix: string;
  masks: SegmentMaskRaw[];
}

export type SegmentJobType = "image_sync" | "image_batch" | "video";
export type SegmentJobAcceptedType = "image_batch" | "video";
export type SegmentJobRequestStatus =
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";
export type SegmentJobTaskStatus = "queued" | "processing" | "success" | "failed";

export interface SegmentJobAcceptedRaw {
  requestId?: string;
  jobId: string;
  type: SegmentJobAcceptedType;
  status: "queued";
  totalItems: number;
  pollPath: string;
}

export interface BatchSegmentAcceptedRaw extends SegmentJobAcceptedRaw {}

export interface BatchSegmentMaskRaw {
  key: string;
  score?: number | null;
  box?: number[] | null;
}

export interface SegmentJobStatusImageItemRaw {
  jobId: string;
  inputS3Key: string;
  status: SegmentJobTaskStatus;
  numInstances?: number | null;
  masks?: BatchSegmentMaskRaw[] | null;
  error?: string | null;
  errorCode?: string | null;
}

export interface SegmentJobVideoOutputRaw {
  framesUrl: string;
  outputS3Prefix: string;
  maskEncoding: string;
}

export interface SegmentJobVideoCountsRaw {
  framesProcessed: number;
  framesWithMasks: number;
  totalMasks: number;
}

export interface SegmentJobVideoStatusRaw {
  jobId: string;
  inputS3Key: string;
  status: SegmentJobTaskStatus;
  output?: SegmentJobVideoOutputRaw;
  counts?: SegmentJobVideoCountsRaw;
  error?: string | null;
  errorCode?: string | null;
}

export interface SegmentJobStatusRaw {
  requestId?: string;
  jobId: string;
  type: SegmentJobType;
  status: SegmentJobRequestStatus;
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  items?: SegmentJobStatusImageItemRaw[];
  video?: SegmentJobVideoStatusRaw;
  error?: string;
  errorCode?: string;
}

export interface BatchSegmentStatusItemRaw extends SegmentJobStatusImageItemRaw {}
export interface BatchSegmentStatusRaw extends SegmentJobStatusRaw {}

export interface PresignedUploadResult {
  uploadUrl: string;
  inputS3Key: string;
  bucket: string;
  expiresIn: number;
  raw: PresignedUploadRaw;
}

export interface SegmentMask {
  key: string;
  score: number;
  box: number[];
  url: string;
}

export interface BatchSegmentMask {
  key: string;
  score?: number;
  box?: number[];
  url: string;
}

export interface SegmentResult {
  requestId: string;
  jobId: string;
  numInstances: number;
  outputPrefix: string;
  outputUrl: string;
  masks: SegmentMask[];
  raw: SegmentResponseRaw;
}

export interface SegmentJobAcceptedResult {
  requestId: string;
  jobId: string;
  type: SegmentJobAcceptedType;
  status: "queued";
  totalItems: number;
  pollPath: string;
  raw: SegmentJobAcceptedRaw;
}

export interface SegmentVideoAcceptedResult extends SegmentJobAcceptedResult {
  type: "video";
}

export interface BatchSegmentAcceptedResult extends SegmentJobAcceptedResult {
  type: "image_batch";
  raw: BatchSegmentAcceptedRaw;
}

export interface SegmentJobStatusImageItem {
  jobId: string;
  inputS3Key: string;
  status: SegmentJobTaskStatus;
  numInstances?: number;
  masks?: BatchSegmentMask[];
  error?: string;
  errorCode?: string;
}

export interface SegmentJobVideoStatus {
  jobId: string;
  inputS3Key: string;
  status: SegmentJobTaskStatus;
  output?: {
    framesUrl: string;
    outputS3Prefix: string;
    maskEncoding: string;
  };
  counts?: {
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  };
  error?: string;
  errorCode?: string;
}

export interface SegmentJobStatusResult {
  requestId: string;
  jobId: string;
  type: SegmentJobType;
  status: SegmentJobRequestStatus;
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  items?: SegmentJobStatusImageItem[];
  video?: SegmentJobVideoStatus;
  error?: string;
  errorCode?: string;
  raw: SegmentJobStatusRaw;
}

export interface BatchSegmentStatusResult extends SegmentJobStatusResult {
  items: SegmentJobStatusImageItem[];
  raw: BatchSegmentStatusRaw;
}

export type ResponseBody = Record<string, unknown> | string | null;
