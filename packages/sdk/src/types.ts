export type BinaryData = Blob | File | Uint8Array;

export type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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
  prompts: string[];
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
  (
    | SegmentVideoSamplingByFps
    | SegmentVideoSamplingByFrameCount
    | SegmentVideoSamplingDefault
  ) & {
    file: BinaryData;
    maxFrames?: number;
    frameIdx?: number;
    clearOldInputs?: boolean;
    signal?: AbortSignal;
  };

export interface BatchSegmentItemInput {
  inputS3Key: string;
}

export interface CreateBatchSegmentJobRequest {
  prompts: string[];
  threshold?: number;
  maskThreshold?: number;
  items: BatchSegmentItemInput[];
  signal?: AbortSignal;
}

export interface GetBatchSegmentJobRequest {
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
  prompts: string[];
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

export interface BatchSegmentMaskRaw {
  key: string;
  score?: number | null;
  box?: number[] | null;
}

export interface SegmentResponseRaw {
  requestId?: string;
  request_id?: string;
  job_id: string;
  num_instances: number;
  output_prefix: string;
  masks: SegmentMaskRaw[];
}

export interface SegmentVideoResponseRaw {
  requestId?: string;
  request_id?: string;
  status: string;
  output: SegmentVideoOutputRaw;
  counts: SegmentVideoCountsRaw;
}

export interface SegmentVideoOutputRaw {
  manifest_url: string;
  frames_url: string;
  output_s3_prefix: string;
  mask_encoding: string;
}

export interface SegmentVideoCountsRaw {
  frames_processed: number;
  frames_with_masks: number;
  total_masks: number;
}

export interface BatchSegmentAcceptedRaw {
  requestId?: string;
  request_id?: string;
  job_id: string;
  status: "queued";
  total_items: number;
  poll_path: string;
}

export interface BatchSegmentStatusItemRaw {
  inputS3Key: string;
  status: "queued" | "processing" | "success" | "failed";
  output_prefix?: string | null;
  num_instances?: number | null;
  masks?: BatchSegmentMaskRaw[] | null;
  error?: string | null;
  error_code?: string | null;
}

export interface BatchSegmentStatusRaw {
  requestId?: string;
  request_id?: string;
  job_id: string;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "failed";
  total_items: number;
  queued_items: number;
  processing_items: number;
  success_items: number;
  failed_items: number;
  items: BatchSegmentStatusItemRaw[];
}

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

export interface SegmentVideoResult {
  requestId: string;
  status: string;
  output: {
    manifestUrl: string;
    framesUrl: string;
    outputS3Prefix: string;
    maskEncoding: string;
  };
  counts: {
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  };
  raw: SegmentVideoResponseRaw;
}

export interface BatchSegmentAcceptedResult {
  requestId: string;
  jobId: string;
  status: "queued";
  totalItems: number;
  pollPath: string;
  raw: BatchSegmentAcceptedRaw;
}

export interface BatchSegmentStatusItem {
  inputS3Key: string;
  status: "queued" | "processing" | "success" | "failed";
  outputPrefix?: string;
  numInstances?: number;
  masks?: BatchSegmentMask[];
  error?: string;
  errorCode?: string;
}

export interface BatchSegmentStatusResult {
  requestId: string;
  jobId: string;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "failed";
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  items: BatchSegmentStatusItem[];
  raw: BatchSegmentStatusRaw;
}

export type ResponseBody = Record<string, unknown> | string | null;
