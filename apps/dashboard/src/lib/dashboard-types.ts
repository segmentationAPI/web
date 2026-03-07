export type BalanceData = {
  tokenUsageLast24h: number;
  tokensRemaining: number;
};

export type JobListItem = {
  apiKeyId: string | null;
  apiKeyPrefix: string | null;
  createdAt: Date;
  errorCode: string | null;
  errorMessage: string | null;
  id: string;
  modality: "image" | "video";
  processingMode: "single" | "batch" | "video";
  prompts: string[];
  status: "queued" | "processing" | "success" | "failed";
  totalTasks: number;
  updatedAt: Date;
  userId: string;
};

export type JobDetail = JobListItem & {
  apiKeyPrefix: string | null;
  inputImageUrl: string | null;
  inputVideoUrl: string | null;
  previewUrl: string | null;
  imageGroups: Array<{
    id: string;
    taskId: string;
    status: "queued" | "processing" | "success" | "failed";
    createdAt: Date;
    inputImageUrl: string | null;
    previewUrl: string | null;
  }>;
  videoOutput: {
    manifestUrl: string;
    framesUrl: string;
    maskEncoding: string;
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
    previewUrl: string | null;
  } | null;
  requestConfig: {
    prompts: string[];
    points: Array<{
      coordinates: [number, number];
      isPositive: boolean;
    }> | null;
    threshold: number | null;
    maskThreshold: number | null;
    frameIdx: number | null;
    fps: number | null;
    generatePreview: boolean | null;
  };
};
