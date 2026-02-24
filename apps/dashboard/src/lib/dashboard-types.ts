import type { Job, JobOutputMask } from "@segmentation/db/schema/app";

export type BalanceData = {
  tokenUsageLast24h: number;
  tokensRemaining: number;
};

export type JobListItem = Job & {
  apiKeyPrefix: string | null;
};

export type JobDetail = Job & {
  apiKeyPrefix: string | null;
  inputImageUrl: string | null;
  inputVideoUrl: string | null;
  outputs: Array<{
    maskIndex: number;
    url: string | null;
    score: number | null;
    box: [number, number, number, number] | null;
  }>;
  videoOutput: {
    manifestUrl: string;
    framesUrl: string;
    outputS3Prefix: string;
    maskEncoding: string;
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  } | null;
};
