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
  outputs: Array<{
    maskIndex: number;
    url: string | null;
    score: number | null;
    box: [number, number, number, number] | null;
  }>;
  imageGroups: Array<{
    id: string;
    status: "queued" | "processing" | "success" | "failed";
    createdAt: Date;
    inputImageUrl: string | null;
    outputs: Array<{
      maskIndex: number;
      url: string | null;
      score: number | null;
      box: [number, number, number, number] | null;
    }>;
  }>;
  videoOutput: {
    manifestUrl: string;
    framesUrl: string;
    maskEncoding: string;
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  } | null;
};
