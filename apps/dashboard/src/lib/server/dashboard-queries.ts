import { db } from "@segmentation/db";
import { apiKey, image, job, jobOutputMask, type ApiKey } from "@segmentation/db/schema/app";
import { and, count, desc, eq, getTableColumns, gte, isNull } from "drizzle-orm";

import type { BalanceData, JobDetail, JobListItem } from "@/lib/dashboard-types";
import { getDynamoTokenBalance } from "@/lib/server/aws/dynamo";
import { buildAssetUrl } from "@/lib/server/aws/s3";
import { DEFAULT_PAGE_SIZE } from "@/lib/server/constants";

const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;
const jobColumns = getTableColumns(job);

export async function getBalanceForUser(userId: string): Promise<BalanceData> {
  const [balance, usageRow] = await Promise.all([
    getDynamoTokenBalance(userId),
    db
      .select({
        requestCountLast24h: count(job.id),
      })
      .from(job)
      .where(
        and(
          eq(job.userId, userId),
          isNull(job.batchJobId),
          gte(job.createdAt, new Date(Date.now() - LAST_24_HOURS_MS)),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  return {
    tokenUsageLast24h: Number(usageRow?.requestCountLast24h ?? 0) * 2,
    tokensRemaining: balance,
  };
}

export async function listApiKeysForUser(userId: string): Promise<ApiKey[]> {
  return db.select().from(apiKey).where(eq(apiKey.userId, userId)).orderBy(desc(apiKey.createdAt));
}

export async function listJobsForUser(params: {
  limit?: number;
  offset?: number;
  userId: string;
}): Promise<{
  items: JobListItem[];
  nextOffset: number | null;
}> {
  const offset = params.offset ?? 0;
  const parsedLimit = params.limit ?? DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(parsedLimit, 1), 100);

  const jobs = await db
    .select({
      ...jobColumns,
      apiKeyPrefix: apiKey.keyPrefix,
    })
    .from(job)
    .leftJoin(apiKey, eq(job.apiKeyId, apiKey.id))
    .where(and(eq(job.userId, params.userId), isNull(job.batchJobId)))
    .orderBy(desc(job.createdAt), desc(job.id))
    .limit(limit)
    .offset(offset);

  return {
    items: jobs,
    nextOffset: jobs.length < limit ? null : offset + jobs.length,
  };
}

export async function getJobDetailForUser(params: {
  jobId: string;
  userId: string;
}): Promise<JobDetail | null> {
  const [row] = await db
    .select({
      ...jobColumns,
      apiKeyPrefix: apiKey.keyPrefix,
      inputS3Path: image.s3Path,
    })
    .from(job)
    .leftJoin(apiKey, eq(job.apiKeyId, apiKey.id))
    .innerJoin(image, eq(job.inputImageId, image.id))
    .where(and(eq(job.userId, params.userId), eq(job.id, params.jobId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const masks = await db
    .select()
    .from(jobOutputMask)
    .where(eq(jobOutputMask.jobId, row.id))
    .orderBy(jobOutputMask.maskIndex);

  return {
    ...row,
    inputImageUrl: buildAssetUrl(row.inputS3Path),
    outputs: masks.map((m) => ({
      maskIndex: m.maskIndex,
      url: buildAssetUrl(m.s3Path),
      score: m.score,
      box: m.box,
    })),
  };
}
