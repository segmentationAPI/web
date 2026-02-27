import { db } from "@segmentation/db";
import {
  apiKey,
  segAsset,
  segRequest,
  segTask,
  segTaskMask,
  segTaskVideoOutput,
} from "@segmentation/db/schema/app";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";

import type { BalanceData, JobDetail, JobListItem } from "@/lib/dashboard-types";
import { getDynamoTokenBalance } from "@/lib/server/aws/dynamo";
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
  const [balance, usageRow] = await Promise.all([
    getDynamoTokenBalance(userId),
    db
      .select({
        requestCountLast24h: count(segRequest.id),
      })
      .from(segRequest)
      .where(
        and(
          eq(segRequest.userId, userId),
          gte(segRequest.createdAt, new Date(Date.now() - LAST_24_HOURS_MS)),
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

  const rows = await db
    .select({
      id: segRequest.id,
      userId: segRequest.userId,
      apiKeyId: segRequest.apiKeyId,
      requestType: segRequest.requestType,
      prompts: segRequest.prompts,
      status: segRequest.status,
      errorCode: segRequest.errorCode,
      errorMessage: segRequest.errorMessage,
      createdAt: segRequest.createdAt,
      updatedAt: segRequest.updatedAt,
      apiKeyPrefix: apiKey.keyPrefix,
    })
    .from(segRequest)
    .leftJoin(apiKey, eq(segRequest.apiKeyId, apiKey.id))
    .where(eq(segRequest.userId, params.userId))
    .orderBy(desc(segRequest.createdAt), desc(segRequest.id))
    .limit(limit)
    .offset(offset);

  const items: JobListItem[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    apiKeyId: row.apiKeyId,
    apiKeyPrefix: row.apiKeyPrefix,
    modality: toUiModality(row.requestType),
    prompts: row.prompts,
    status: toUiStatus(row.status),
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    items,
    nextOffset: rows.length < limit ? null : offset + rows.length,
  };
}

export async function getJobDetailForUser(params: {
  jobId: string;
  userId: string;
}): Promise<JobDetail | null> {
  const [requestRow] = await db
    .select({
      id: segRequest.id,
      userId: segRequest.userId,
      apiKeyId: segRequest.apiKeyId,
      requestType: segRequest.requestType,
      prompts: segRequest.prompts,
      status: segRequest.status,
      errorCode: segRequest.errorCode,
      errorMessage: segRequest.errorMessage,
      createdAt: segRequest.createdAt,
      updatedAt: segRequest.updatedAt,
      apiKeyPrefix: apiKey.keyPrefix,
    })
    .from(segRequest)
    .leftJoin(apiKey, eq(segRequest.apiKeyId, apiKey.id))
    .where(and(eq(segRequest.userId, params.userId), eq(segRequest.id, params.jobId)))
    .limit(1);

  if (!requestRow) {
    return null;
  }

  const taskRows = await db
    .select({
      id: segTask.id,
      taskType: segTask.taskType,
      status: segTask.status,
      inputS3Path: segAsset.s3Path,
    })
    .from(segTask)
    .innerJoin(segAsset, eq(segTask.inputAssetId, segAsset.id))
    .where(and(eq(segTask.requestId, requestRow.id), eq(segTask.userId, params.userId)))
    .orderBy(desc(segTask.createdAt));

  const taskIds = taskRows.map((task) => task.id);
  const [masks, videoOutputs] = await Promise.all([
    taskIds.length === 0
      ? []
      : db
          .select()
          .from(segTaskMask)
          .where(inArray(segTaskMask.taskId, taskIds))
          .orderBy(segTaskMask.maskIndex),
    taskIds.length === 0
      ? []
      : db
          .select({
            taskId: segTaskVideoOutput.taskId,
            manifestUrl: segTaskVideoOutput.manifestUrl,
            framesUrl: segTaskVideoOutput.framesUrl,
            outputS3Prefix: segTaskVideoOutput.outputS3Prefix,
            maskEncoding: segTaskVideoOutput.maskEncoding,
            framesProcessed: segTaskVideoOutput.framesProcessed,
            framesWithMasks: segTaskVideoOutput.framesWithMasks,
            totalMasks: segTaskVideoOutput.totalMasks,
          })
          .from(segTaskVideoOutput)
          .where(inArray(segTaskVideoOutput.taskId, taskIds))
          .limit(1),
  ]);

  const firstImageTask = taskRows.find((task) => task.taskType === "image");
  const firstVideoTask = taskRows.find((task) => task.taskType === "video");
  const videoOutput = videoOutputs[0];

  return {
    id: requestRow.id,
    userId: requestRow.userId,
    apiKeyId: requestRow.apiKeyId,
    apiKeyPrefix: requestRow.apiKeyPrefix,
    prompts: requestRow.prompts,
    status: toUiStatus(requestRow.status),
    modality: toUiModality(requestRow.requestType),
    errorCode: requestRow.errorCode,
    errorMessage: requestRow.errorMessage,
    createdAt: requestRow.createdAt,
    updatedAt: requestRow.updatedAt,
    inputImageUrl: firstImageTask ? buildAssetUrl(firstImageTask.inputS3Path) : null,
    inputVideoUrl: firstVideoTask ? buildAssetUrl(firstVideoTask.inputS3Path) : null,
    outputs: masks.map((mask, index) => ({
      maskIndex: index,
      url: buildAssetUrl(mask.s3Path),
      score: mask.score,
      box: mask.box,
    })),
    videoOutput: videoOutput
      ? {
          manifestUrl: videoOutput.manifestUrl,
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
