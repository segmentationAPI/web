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
  outputs: Array<{
    maskIndex: number;
    url: string | null;
    score: number | null;
    box: [number, number, number, number] | null;
  }>;
};
