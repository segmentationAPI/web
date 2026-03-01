import { db } from "@segmentation/db";
import { apiKey } from "@segmentation/db/schema/app";
import { normalizeMaskArtifacts } from "@segmentationapi/sdk";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { BalanceData, JobDetail, JobListItem } from "@/lib/dashboard-types";
import {
  getDynamoTokenBalance,
  getDynamoJob,
  listDynamoJobsForAccount,
  listDynamoTasksForJob,
} from "@/lib/server/aws/dynamo";
import { buildAssetUrl, fetchAssetJson } from "@/lib/server/aws/s3";
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

function toUiTaskStatus(
  status: "queued" | "running" | "processing" | "success" | "failed",
): "queued" | "processing" | "success" | "failed" {
  if (status === "queued") {
    return "queued";
  }

  if (status === "success") {
    return "success";
  }

  if (status === "running" || status === "processing") {
    return "processing";
  }

  return "failed";
}

type InputManifestDocument = {
  payload?: {
    prompts?: unknown;
    boxes?: unknown;
    points?: unknown;
    inputS3Key?: unknown;
  };
};

type OutputManifestDocument = {
  result?: unknown;
  items?: Record<string, { result?: unknown } | unknown>;
};

function normalizeImageOutputs(
  result: unknown,
  context: { userId: string; jobId: string; taskId: string },
): JobDetail["outputs"] {
  return normalizeMaskArtifacts(result, context).map((mask) => ({
    maskIndex: mask.maskIndex,
    url: mask.url,
    score: mask.score,
    box: mask.box,
  }));
}

function normalizeVideoOutput(
  result: unknown,
  manifestUrl: string | null,
): JobDetail["videoOutput"] {
  if (!result || typeof result !== "object") {
    return null;
  }

  const typedResult = result as Record<string, unknown>;
  const output = typedResult.output && typeof typedResult.output === "object"
    ? (typedResult.output as Record<string, unknown>)
    : {};
  const counts = typedResult.counts && typeof typedResult.counts === "object"
    ? (typedResult.counts as Record<string, unknown>)
    : {};

  const framesPath =
    typeof output.suggestedS3Keys === "object" && output.suggestedS3Keys
      ? (output.suggestedS3Keys as Record<string, unknown>).frames_ndjson_gz
      : null;

  const resolvedFramesUrl =
    typeof output.framesUrl === "string"
      ? output.framesUrl
      : typeof output.frames_url === "string"
        ? output.frames_url
        : typeof framesPath === "string"
          ? buildAssetUrl(framesPath)
          : null;

  if (!resolvedFramesUrl || !manifestUrl) {
    return null;
  }

  return {
    manifestUrl,
    framesUrl: resolvedFramesUrl,
    maskEncoding: typeof output.maskEncoding === "string"
      ? output.maskEncoding
      : typeof output.mask_encoding === "string"
        ? output.mask_encoding
        : "coco_rle",
    framesProcessed: Number(counts.frames_processed ?? counts.framesProcessed ?? 0),
    framesWithMasks: Number(counts.frames_with_masks ?? counts.framesWithMasks ?? 0),
    totalMasks: Number(counts.total_masks ?? counts.totalMasks ?? 0),
  };
}

function toUiModality(requestType: "image_sync" | "image_batch" | "video"): "image" | "video" {
  return requestType === "video" ? "video" : "image";
}

function toUiProcessingMode(
  requestType: "image_sync" | "image_batch" | "video",
): "single" | "batch" | "video" {
  if (requestType === "video") {
    return "video";
  }
  return requestType === "image_batch" ? "batch" : "single";
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

  const apiKeyIds = Array.from(
    new Set(page.map((job) => job.apiKeyId).filter(Boolean)),
  ) as string[];
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
    processingMode: toUiProcessingMode(job.requestType),
    prompts: job.prompts,
    status: toUiStatus(job.status),
    totalTasks: Math.max(job.totalTasks, 0),
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

  const outputFolder = job.outputFolder?.trim() ?? "";
  const baseOutputKey = outputFolder.length > 0
    ? `outputs/${job.accountId}/${outputFolder}`
    : `outputs/${job.accountId}/${job.jobId}`;
  const sharedInputManifestKey = `${baseOutputKey}/input_manifest.json`;
  const sharedOutputManifestKey = `${baseOutputKey}/output_manifest.json`;

  const [sharedInputManifest, sharedOutputManifest] = await Promise.all([
    fetchAssetJson<InputManifestDocument>(sharedInputManifestKey),
    fetchAssetJson<OutputManifestDocument>(sharedOutputManifestKey),
  ]);

  const sharedOutputManifestItems =
    sharedOutputManifest?.items && typeof sharedOutputManifest.items === "object"
      ? sharedOutputManifest.items
      : null;
  const sharedOutputManifestUrl = buildAssetUrl(sharedOutputManifestKey);

  const taskManifests = await Promise.all(
    tasks.map(async (task) => {
      const inputManifest = sharedInputManifest;

      const sharedOutputItemRaw = sharedOutputManifestItems?.[task.taskId];
      const sharedOutputItem =
        sharedOutputItemRaw && typeof sharedOutputItemRaw === "object"
          ? (sharedOutputItemRaw as Record<string, unknown>)
          : null;

      const outputManifest = sharedOutputItem
        ? ({ result: sharedOutputItem.result } as OutputManifestDocument)
        : null;

      return {
        task,
        inputManifest,
        outputManifest,
        outputManifestUrl: sharedOutputManifestUrl,
      };
    }),
  );

  const apiKeyPrefix = job.apiKeyId
    ? await db
        .select({ keyPrefix: apiKey.keyPrefix })
        .from(apiKey)
        .where(and(eq(apiKey.userId, params.userId), eq(apiKey.id, job.apiKeyId)))
        .limit(1)
        .then((rows) => rows[0]?.keyPrefix ?? null)
    : null;

  const firstTaskManifest = taskManifests[0]?.inputManifest?.payload ?? {};
  const promptsFromManifest = Array.isArray(firstTaskManifest.prompts)
    ? firstTaskManifest.prompts.map((value) => String(value).trim()).filter((value) => value.length > 0)
    : [];

  const imageGroups = taskManifests
    .filter(() => job.requestType !== "video")
    .map(({ task, inputManifest, outputManifest }) => {
      const payload = inputManifest?.payload;
      const inputImageUrl =
        typeof payload?.inputS3Key === "string"
          ? buildAssetUrl(payload.inputS3Key)
          : task.inputS3Key
            ? buildAssetUrl(task.inputS3Key)
            : null;

      return {
        id: task.taskId,
        status: toUiTaskStatus(task.status),
        createdAt: task.createdAt,
        inputImageUrl,
        outputs: normalizeImageOutputs(outputManifest?.result, {
          userId: params.userId,
          jobId: params.jobId,
          taskId: task.taskId,
        }),
      };
    });

  const outputs = imageGroups.flatMap((group) => group.outputs);

  const firstVideoManifest = taskManifests[0];
  const videoOutput = job.requestType === "video"
    ? normalizeVideoOutput(firstVideoManifest?.outputManifest?.result, firstVideoManifest?.outputManifestUrl ?? null)
    : null;

  const inputImageUrl = imageGroups[0]?.inputImageUrl ?? null;
  const inputVideoUrl =
    typeof firstVideoManifest?.inputManifest?.payload?.inputS3Key === "string"
      ? buildAssetUrl(firstVideoManifest.inputManifest.payload.inputS3Key)
      : firstVideoManifest?.task.inputS3Key
        ? buildAssetUrl(firstVideoManifest.task.inputS3Key)
        : null;

  return {
    id: job.jobId,
    userId: job.accountId,
    apiKeyId: job.apiKeyId,
    apiKeyPrefix,
    prompts: promptsFromManifest.length > 0 ? promptsFromManifest : job.prompts,
    status: toUiStatus(job.status),
    modality: toUiModality(job.requestType),
    processingMode: toUiProcessingMode(job.requestType),
    totalTasks: Math.max(job.totalTasks, 0),
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    inputImageUrl,
    inputVideoUrl,
    outputs,
    imageGroups,
    videoOutput,
  };
}
