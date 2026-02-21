import type { SegmentResult } from "@segmentationapi/sdk";

export type BatchMask = {
  key: string;
  url: string;
  score?: number;
  box?: number[];
};

export type BatchItemStatus = {
  index: number;
  inputS3Key: string;
  status: "queued" | "processing" | "success" | "failed";
  masks?: BatchMask[];
  error?: string;
  errorCode?: string;
};

export type BatchSegmentStatusResult = {
  requestId: string;
  jobId: string;
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed";
  totalItems: number;
  queuedItems: number;
  processingItems: number;
  successItems: number;
  failedItems: number;
  items: BatchItemStatus[];
};

export type PlaygroundMaskPreview = {
  url: string;
};

export type PlaygroundResult =
  | {
      mode: "single";
      raw: SegmentResult;
      previewFileIndex: number;
      previewMasks: PlaygroundMaskPreview[];
      summary: string;
    }
  | {
      mode: "batch";
      raw: BatchSegmentStatusResult;
      previewFileIndex: number | null;
      previewMasks: PlaygroundMaskPreview[];
      summary: string;
    };

export type PlaygroundErrorState = {
  details: string[];
  title: string;
};

export type PlaygroundStatus = "idle" | "ready" | "running";

export type RunButtonState = "default" | "running";
