import { db } from "@segmentation/db";
import { apiKey } from "@segmentation/db/schema/app";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { BalanceData, JobDetail, JobListItem } from "@/lib/dashboard-types";
import {
  getDynamoTokenBalance,
  getDynamoJob,
  listDynamoJobsForAccount,
  listDynamoTasksForJob,
} from "@/lib/server/aws/dynamo";
import { buildAssetUrl } from "@/lib/server/aws/s3";
import { DEFAULT_PAGE_SIZE } from "@/lib/server/constants";

const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;

function toUiStatus(
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed",
): "queued" | "processing" | "success" | "failed" {
  if (status === "queued" || status === "processing") {
    return status;
  }
  if (status === "completed") {
    return "success";
  }
  return "failed";
}

function toUiModality(requestType: "image_sync" | "image_batch" | "video"): "image" | "video" {
  return requestType === "video" ? "video" : "image";
}

export async function getBalanceForUser(userId: string): Promise<BalanceData> {
  const [balance, jobs] = await Promise.all([
    getDynamoTokenBalance(userId),
    listDynamoJobsForAccount(userId),
  ]);

  const cutoff = Date.now() - LAST_24_HOURS_MS;
  const requestCountLast24h = jobs.filter((job) => job.createdAt.getTime() >= cutoff).length;

  return {
    tokenUsageLast24h: requestCountLast24h * 2,
    tokensRemaining: balance,
  };
}

export async function listApiKeysForUser(userId: string) {
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

  const jobs = await listDynamoJobsForAccount(params.userId);
  const page = jobs.slice(offset, offset + limit);

  const apiKeyIds = Array.from(new Set(page.map((job) => job.apiKeyId).filter(Boolean))) as string[];
  const prefixes = apiKeyIds.length
    ? await db
        .select({
          id: apiKey.id,
          keyPrefix: apiKey.keyPrefix,
        })
        .from(apiKey)
        .where(and(eq(apiKey.userId, params.userId), inArray(apiKey.id, apiKeyIds)))
    : [];

  const prefixById = new Map(prefixes.map((row) => [row.id, row.keyPrefix]));

  const items: JobListItem[] = page.map((job) => ({
    id: job.jobId,
    userId: job.accountId,
    apiKeyId: job.apiKeyId,
    apiKeyPrefix: job.apiKeyId ? (prefixById.get(job.apiKeyId) ?? null) : null,
    modality: toUiModality(job.requestType),
    prompts: job.prompts,
    status: toUiStatus(job.status),
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));

  return {
    items,
    nextOffset: offset + page.length >= jobs.length ? null : offset + page.length,
  };
}

export async function getJobDetailForUser(params: {
  jobId: string;
  userId: string;
}): Promise<JobDetail | null> {
  const [job, tasks] = await Promise.all([
    getDynamoJob(params.userId, params.jobId),
    listDynamoTasksForJob(params.userId, params.jobId),
  ]);

  if (!job) {
    return null;
  }

  const apiKeyPrefix = job.apiKeyId
    ? await db
        .select({ keyPrefix: apiKey.keyPrefix })
        .from(apiKey)
        .where(and(eq(apiKey.userId, params.userId), eq(apiKey.id, job.apiKeyId)))
        .limit(1)
        .then((rows) => rows[0]?.keyPrefix ?? null)
    : null;

  const firstImageTask = tasks.find((task) => task.taskType === "image");
  const firstVideoTask = tasks.find((task) => task.taskType === "video");
  const videoOutput = firstVideoTask?.videoOutput ?? null;

  const outputs = tasks
    .flatMap((task) => task.masks)
    .sort((a, b) => a.maskIndex - b.maskIndex)
    .map((mask, index) => ({
      maskIndex: index,
      url: buildAssetUrl(mask.s3Path),
      score: mask.score,
      box: mask.box,
    }));

  return {
    id: job.jobId,
    userId: job.accountId,
    apiKeyId: job.apiKeyId,
    apiKeyPrefix,
    prompts: job.prompts,
    status: toUiStatus(job.status),
    modality: toUiModality(job.requestType),
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    inputImageUrl: firstImageTask?.inputS3Key ? buildAssetUrl(firstImageTask.inputS3Key) : null,
    inputVideoUrl: firstVideoTask?.inputS3Key ? buildAssetUrl(firstVideoTask.inputS3Key) : null,
    outputs,
    videoOutput: videoOutput
      ? {
          manifestUrl: videoOutput.framesUrl,
          framesUrl: videoOutput.framesUrl,
          outputS3Prefix: videoOutput.outputS3Prefix,
          maskEncoding: videoOutput.maskEncoding,
          framesProcessed: videoOutput.framesProcessed,
          framesWithMasks: videoOutput.framesWithMasks,
          totalMasks: videoOutput.totalMasks,
        }
      : null,
  };
}
