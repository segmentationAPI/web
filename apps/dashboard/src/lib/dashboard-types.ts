import { type RequestJob } from "@segmentation/db/schema/app";

export type BalanceData = {
  tokenUsageLast24h: number;
  tokensRemaining: number;
};

export type JobListItem = RequestJob & {
  apiKeyPrefix: string | null;
};

export type JobDetail = RequestJob & {
  apiKeyPrefix: string | null;
  inputImageUrl: string | null;
  outputs: Array<{
    outputIndex: number;
    url: string | null;
  }>;
};
