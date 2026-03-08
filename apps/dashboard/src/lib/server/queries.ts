import "server-only";

import { SegmentationClient, type JobListItemResponse } from "@segmentationapi/sdk";
import { db } from "@segmentation/db";
import { apiKey } from "@segmentation/db/schema/app";
import { desc, eq } from "drizzle-orm";
import type { JobListItem, OverviewData } from "@/lib/dashboard-types";
import {
  getDynamoBillingState,
  getDynamoUsageForLast24Hours,
} from "@/lib/server/aws/dynamo";
import { DEFAULT_PAGE_SIZE } from "@/lib/server/constants";
import { user } from "@segmentation/db/schema/auth";

type ListedJobSummary = {
  createdAt: Date;
  id: string;
  modality: JobListItem["modality"];
  processingMode: JobListItem["processingMode"];
  status: JobListItem["status"];
  totalTasks: number;
  updatedAt: Date;
};

function parseSdkDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function toUiStatus(status: JobListItemResponse["status"]): JobListItem["status"] {
  if (status === "queued" || status === "processing") {
    return status;
  }

  if (status === "completed") {
    return "success";
  }

  return "failed";
}

function toListedJobSummary(job: JobListItemResponse): ListedJobSummary {
  return {
    id: job.jobId,
    modality: job.type === "video" ? "video" : "image",
    processingMode: job.type === "video" ? "video" : job.totalItems > 1 ? "batch" : "single",
    status: toUiStatus(job.status),
    totalTasks: Math.max(job.totalItems, 0),
    createdAt: parseSdkDate(job.createdAt),
    updatedAt: parseSdkDate(job.updatedAt),
  };
}

async function getSegmentationClientForUser(userId: string) {
  const activeApiKey = await getActiveApiKeyForuser(userId);

  if (!activeApiKey) {
    return null;
  }

  return SegmentationClient.create(activeApiKey);
}

async function listAllSdkJobs(segmentationClient: SegmentationClient | null) {
  if (!segmentationClient) {
    return [];
  }

  const jobs: ListedJobSummary[] = [];
  let nextToken: string | undefined;

  do {
    const response = await segmentationClient.listJobs({
      limit: 100,
      nextToken,
    });

    jobs.push(...response.items.map(toListedJobSummary));
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return jobs;
}

export async function getOverviewForUser(userId: string): Promise<OverviewData> {
  return {
    tokenUsageLast24h: await getDynamoUsageForLast24Hours(userId),
  };
}

export async function listApiKeysForUser(userId: string) {
  return db.select().from(apiKey).where(eq(apiKey.userId, userId)).orderBy(desc(apiKey.createdAt));
}

export async function getBillingSummaryForUser(userId: string) {
  return getDynamoBillingState(userId);
}

export async function listJobsForUser(params: {
  limit?: number;
  query: {
    page: number;
    q: string;
    status: JobListItem["status"] | "all";
    mode: JobListItem["processingMode"] | "all";
  };
  userId: string;
}): Promise<{
  items: JobListItem[];
  nextOffset: number | null;
  totalCount: number;
}> {
  const parsedLimit = params.limit ?? DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(parsedLimit, 1), 100);
  const pageNumber = Math.max(params.query.page, 1);
  const offset = (pageNumber - 1) * limit;
  const normalizedQuery = params.query.q.trim().toLowerCase();
  const segmentationClient = await getSegmentationClientForUser(params.userId);

  let filteredJobs = await listAllSdkJobs(segmentationClient);

  if (params.query.mode !== "all") {
    filteredJobs = filteredJobs.filter((job) => job.processingMode === params.query.mode);
  }

  if (normalizedQuery.length > 0) {
    filteredJobs = filteredJobs.filter((job) => job.id.toLowerCase().includes(normalizedQuery));
  }

  if (params.query.status !== "all") {
    filteredJobs = filteredJobs.filter((job) => job.status === params.query.status);
  }

  const totalCount = filteredJobs.length;
  const page = filteredJobs.slice(offset, offset + limit);

  const items: JobListItem[] = page.map((job) => ({
    id: job.id,
    userId: params.userId,
    apiKeyId: null,
    apiKeyPrefix: null,
    modality: job.modality,
    processingMode: job.processingMode,
    prompts: [],
    status: job.status,
    totalTasks: job.totalTasks,
    errorCode: null,
    errorMessage: null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));

  return {
    items,
    nextOffset: offset + page.length >= totalCount ? null : offset + page.length,
    totalCount,
  };
}

export async function getJobSummaryForUser(params: {
  jobId: string;
  userId: string;
}): Promise<JobListItem | null> {
  const segmentationClient = await getSegmentationClientForUser(params.userId);

  if (!segmentationClient) {
    return null;
  }

  const jobs = await listAllSdkJobs(segmentationClient);
  const job = jobs.find((candidate) => candidate.id === params.jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    userId: params.userId,
    apiKeyId: null,
    apiKeyPrefix: null,
    modality: job.modality,
    processingMode: job.processingMode,
    prompts: [],
    status: job.status,
    totalTasks: job.totalTasks,
    errorCode: null,
    errorMessage: null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function getActiveApiKeyForuser(userId: string): Promise<string | null> {
  const results = await db
    .select({ apiKey: user.activeApiKey })
    .from(user)
    .where(eq(user.id, userId));
  const result = results.at(0);

  if (!result || !result.apiKey) {
    return null;
  }

  return result.apiKey;
}
