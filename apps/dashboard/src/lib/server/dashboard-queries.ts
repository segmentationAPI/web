import { db } from "@segmentation/db";
import {
  apiKey,
  labelImage,
  labelProject,
  requestJob,
  type ApiKey,
  type LabelImage,
  type LabelProject,
} from "@segmentation/db/schema/app";
import { and, count, desc, eq, getTableColumns, gte } from "drizzle-orm";

import type { BalanceData, JobDetail, JobListItem } from "@/lib/dashboard-types";
import { getDynamoTokenBalance } from "@/lib/server/aws/dynamo";
import { buildAssetUrlByKey, buildInputImageKey, buildOutputMaskKey } from "@/lib/server/aws/s3";
import { DEFAULT_PAGE_SIZE } from "@/lib/server/constants";

const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;
const requestJobColumns = getTableColumns(requestJob);

export async function getBalanceForUser(userId: string): Promise<BalanceData> {
  const [balance, usageRow] = await Promise.all([
    getDynamoTokenBalance(userId),
    db
      .select({
        requestCountLast24h: count(requestJob.id),
      })
      .from(requestJob)
      .where(
        and(
          eq(requestJob.userId, userId),
          gte(requestJob.createdAt, new Date(Date.now() - LAST_24_HOURS_MS)),
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
      ...requestJobColumns,
      apiKeyPrefix: apiKey.keyPrefix,
    })
    .from(requestJob)
    .leftJoin(apiKey, eq(requestJob.apiKeyId, apiKey.id))
    .where(eq(requestJob.userId, params.userId))
    .orderBy(desc(requestJob.createdAt), desc(requestJob.id))
    .limit(limit)
    .offset(offset);

  return {
    items: jobs,
    nextOffset: jobs.length < limit ? null : offset + jobs.length,
  };
}

export async function listLabelProjectsForUser(userId: string): Promise<LabelProject[]> {
  return db
    .select()
    .from(labelProject)
    .where(eq(labelProject.userId, userId))
    .orderBy(desc(labelProject.createdAt));
}

export async function getLabelProjectForUser(params: {
  projectId: string;
  userId: string;
}): Promise<LabelProject | null> {
  const [project] = await db
    .select()
    .from(labelProject)
    .where(and(eq(labelProject.id, params.projectId), eq(labelProject.userId, params.userId)))
    .limit(1);
  return project ?? null;
}

export async function getLabelProjectImages(projectId: string): Promise<LabelImage[]> {
  return db
    .select()
    .from(labelImage)
    .where(eq(labelImage.projectId, projectId))
    .orderBy(labelImage.createdAt);
}

export async function getJobDetailForUser(params: {
  jobId: string;
  userId: string;
}): Promise<JobDetail | null> {
  const [job] = await db
    .select({
      ...requestJobColumns,
      apiKeyPrefix: apiKey.keyPrefix,
    })
    .from(requestJob)
    .leftJoin(apiKey, eq(requestJob.apiKeyId, apiKey.id))
    .where(and(eq(requestJob.userId, params.userId), eq(requestJob.id, params.jobId)))
    .limit(1);

  if (!job) {
    return null;
  }

  const inputImageUrl = buildAssetUrlByKey(
    buildInputImageKey({
      imageName: job.inputImageName,
      userId: params.userId,
    }),
  );

  const outputUrls = Array.from({ length: Math.max(job.outputCount, 0) }, (_, outputIndex) => ({
    outputIndex,
    url: buildAssetUrlByKey(
      buildOutputMaskKey({
        jobId: job.id,
        outputIndex,
        userId: params.userId,
      }),
    ),
  }));

  return {
    ...job,
    inputImageUrl,
    outputs: outputUrls,
  };
}
