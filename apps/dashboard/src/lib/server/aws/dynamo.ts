import "server-only";

import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { env } from "@segmentation/env/dashboard";

import { dynamoClient } from "./clients";

export type DynamoJob = {
  accountId: string;
  jobId: string;
  requestType: "image_sync" | "image_batch" | "video";
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed";
  prompts: string[];
  apiKeyId: string | null;
  totalTasks: number;
  queuedTasks: number;
  processingTasks: number;
  successTasks: number;
  failedTasks: number;
  errorCode: string | null;
  errorMessage: string | null;
  inputs: string[];
  createdAt: Date;
  updatedAt: Date;
};

type DerivedJobStats = Pick<
  DynamoJob,
  "status" | "totalTasks" | "queuedTasks" | "processingTasks" | "successTasks" | "failedTasks"
>;

export type DynamoTask = {
  accountId: string;
  id: string;
  taskId: string;
  requestId: string;
  taskType: "image" | "video";
  status: "queued" | "running" | "processing" | "success" | "failed";
  inputS3Key: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  videoOutput: {
    framesUrl: string;
    maskEncoding: string;
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DynamoBillingState = {
  accountId: string;
  accessStatus: "allowed" | "blocked";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  latestInvoiceId: string | null;
  latestInvoiceStatus: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  delinquentSince: Date | null;
  updatedAt: Date | null;
};

function toDate(value: unknown) {
  if (typeof value !== "string") {
    return new Date(0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePrefixedKey(value: unknown, prefix: string) {
  if (typeof value !== "string") {
    return null;
  }

  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

function parseJob(item: Record<string, unknown>): DynamoJob {
  const parsedInputs = Array.isArray(item.inputs)
    ? item.inputs.map((value) => String(value).trim()).filter((value) => value.length > 0)
    : [];

  const accountId = toNullableString(item.accountId) ?? parsePrefixedKey(item.PK, "USER#") ?? "";

  const jobId =
    toNullableString(item.jobId) ??
    toNullableString(item.id) ??
    parsePrefixedKey(item.SK, "JOB#") ??
    parsePrefixedKey(item.GSI1PK, "JOB#") ??
    "";

  return {
    accountId,
    jobId,
    requestType: String(item.type ?? "image_batch") as DynamoJob["requestType"],
    status: "queued",
    prompts: Array.isArray(item.prompts)
      ? item.prompts.map((prompt) => String(prompt)).filter(Boolean)
      : [],
    apiKeyId: toNullableString(item.apiKeyId),
    totalTasks: Number(item.totalItems ?? 0),
    queuedTasks: Number(item.queuedItems ?? 0),
    processingTasks: Number(item.processingItems ?? 0),
    successTasks: Number(item.successItems ?? 0),
    failedTasks: Number(item.failedItems ?? 0),
    errorCode: toNullableString(item.errorCode),
    errorMessage: toNullableString(item.errorMessage),
    inputs: parsedInputs,
    createdAt: toDate(item.createdAt),
    updatedAt: toDate(item.updatedAt ?? item.createdAt),
  };
}

function parseTask(item: Record<string, unknown>): DynamoTask {
  const parsedTaskId = toNullableString(item.taskId) ?? toNullableString(item.id) ?? "";
  const accountId = toNullableString(item.accountId) ?? parsePrefixedKey(item.PK, "USER#") ?? "";
  const requestId =
    toNullableString(item.jobId) ??
    parsePrefixedKey(item.GSI1PK, "JOB#") ??
    parseTaskJobId(item.SK) ??
    "";

  let videoOutputRaw: Record<string, unknown> | null = null;
  if (typeof item.videoOutput === "string") {
    try {
      const parsed = JSON.parse(item.videoOutput);
      videoOutputRaw =
        parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      // ignore malformed JSON
    }
  } else if (item.videoOutput && typeof item.videoOutput === "object") {
    videoOutputRaw = item.videoOutput as Record<string, unknown>;
  }

  const videoOutput =
    videoOutputRaw && typeof videoOutputRaw.frames_url === "string"
      ? {
          framesUrl: videoOutputRaw.frames_url,
          maskEncoding:
            typeof videoOutputRaw.mask_encoding === "string"
              ? videoOutputRaw.mask_encoding
              : "coco_rle",
          framesProcessed: Number(videoOutputRaw.frames_processed ?? 0),
          framesWithMasks: Number(videoOutputRaw.frames_with_masks ?? 0),
          totalMasks: Number(videoOutputRaw.total_masks ?? 0),
        }
      : null;

  let payload: Record<string, unknown> = {};
  if (typeof item.payload === "string") {
    try {
      const parsed = JSON.parse(item.payload);
      payload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      // ignore malformed JSON
    }
  }

  return {
    accountId,
    id: parsedTaskId,
    taskId: parsedTaskId,
    requestId,
    taskType:
      String(item.type ?? item.requestType ?? "image_batch") === "video" ? "video" : "image",
    status: String(item.status ?? "queued") as DynamoTask["status"],
    inputS3Key: toNullableString(payload.inputS3Key),
    errorCode: toNullableString(item.errorCode),
    errorMessage: toNullableString(item.errorMessage),
    videoOutput,
    createdAt: toDate(item.createdAt),
    updatedAt: toDate(item.updatedAt),
  };
}

function parseTaskJobId(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("TASK#")) {
    return null;
  }

  const remainder = value.slice("TASK#".length);
  const separatorIndex = remainder.indexOf("#");
  if (separatorIndex === -1) {
    return null;
  }

  return remainder.slice(0, separatorIndex) || null;
}

function toNullableDate(value: unknown) {
  const parsed = toDate(value);
  return parsed.getTime() === 0 ? null : parsed;
}

function deriveJobStats(tasks: DynamoTask[]): DerivedJobStats {
  const queuedTasks = tasks.filter((task) => task.status === "queued").length;
  const processingTasks = tasks.filter(
    (task) => task.status === "running" || task.status === "processing",
  ).length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;
  const successTasks = tasks.filter((task) => task.status === "success").length;
  const totalTasks = tasks.length;

  if (totalTasks === 0 || queuedTasks === totalTasks) {
    return {
      status: "queued",
      totalTasks,
      queuedTasks,
      processingTasks,
      successTasks,
      failedTasks,
    };
  }

  if (queuedTasks + processingTasks > 0) {
    return {
      status: "processing",
      totalTasks,
      queuedTasks,
      processingTasks,
      successTasks,
      failedTasks,
    };
  }

  if (failedTasks === totalTasks) {
    return {
      status: "failed",
      totalTasks,
      queuedTasks,
      processingTasks,
      successTasks,
      failedTasks,
    };
  }

  return {
    status: failedTasks > 0 ? "completed_with_errors" : "completed",
    totalTasks,
    queuedTasks,
    processingTasks,
    successTasks,
    failedTasks,
  };
}

function applyDerivedJobStats(job: DynamoJob, tasks: DynamoTask[]): DynamoJob {
  return {
    ...job,
    ...deriveJobStats(tasks),
  };
}

export async function putDynamoApiKey(params: {
  accountId: string;
  keyHash: string;
  keyId: string;
  keyPrefix: string;
  revoked: boolean;
}) {
  await dynamoClient.send(
    new PutItemCommand({
      TableName: env.AWS_DYNAMO_API_KEYS_TABLE,
      Item: marshall({
        accountId: params.accountId,
        keyHash: params.keyHash,
        keyId: params.keyId,
        keyPrefix: params.keyPrefix,
        revoked: params.revoked,
      }),
    }),
  );
}

export async function getDynamoBillingState(accountId: string): Promise<DynamoBillingState | null> {
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: env.AWS_DYNAMO_BILLING_STATE_TABLE,
      Key: marshall({ accountId }),
    }),
  );

  if (!response.Item) {
    return null;
  }

  const item = unmarshall(response.Item);

  return {
    accountId,
    accessStatus: String(item.accessStatus ?? "blocked") === "allowed" ? "allowed" : "blocked",
    stripeCustomerId: toNullableString(item.stripeCustomerId),
    stripeSubscriptionId: toNullableString(item.stripeSubscriptionId),
    stripeSubscriptionStatus: toNullableString(item.stripeSubscriptionStatus),
    latestInvoiceId: toNullableString(item.latestInvoiceId),
    latestInvoiceStatus: toNullableString(item.latestInvoiceStatus),
    currentPeriodStart: toNullableDate(item.currentPeriodStart),
    currentPeriodEnd: toNullableDate(item.currentPeriodEnd),
    delinquentSince: toNullableDate(item.delinquentSince),
    updatedAt: toNullableDate(item.updatedAt),
  };
}

export async function getDynamoUsageForLast24Hours(accountId: string) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let totalQuantity = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.AWS_DYNAMO_USAGE_LEDGER_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: marshall({
          ":pk": `USER#${accountId}`,
          ":prefix": "USAGE#",
        }),
        ExclusiveStartKey: lastEvaluatedKey ? marshall(lastEvaluatedKey) : undefined,
      }),
    );

    for (const rawItem of response.Items ?? []) {
      const item = unmarshall(rawItem);
      const occurredAt = toDate(item.occurredAt);
      if (occurredAt.getTime() < cutoff) {
        continue;
      }

      totalQuantity += Number(item.quantity ?? 0);
    }

    lastEvaluatedKey = response.LastEvaluatedKey
      ? unmarshall(response.LastEvaluatedKey)
      : undefined;
  } while (lastEvaluatedKey);

  return totalQuantity;
}

export async function setDynamoApiKeyRevoked(params: { keyId: string; revoked: boolean }) {
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: env.AWS_DYNAMO_API_KEYS_TABLE,
      Key: marshall({
        keyId: params.keyId,
      }),
      UpdateExpression: "SET revoked = :revoked",
      ExpressionAttributeValues: marshall({
        ":revoked": params.revoked,
      }),
    }),
  );
}

export async function getDynamoJob(accountId: string, jobId: string) {
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: env.AWS_DYNAMO_JOBS_TABLE,
      Key: marshall({ PK: `USER#${accountId}`, SK: `JOB#${jobId}` }),
    }),
  );

  if (!response.Item) {
    return null;
  }

  const [job, tasks] = await Promise.all([
    Promise.resolve(parseJob(unmarshall(response.Item))),
    listDynamoTasksForJob(accountId, jobId),
  ]);

  return applyDerivedJobStats(job, tasks);
}

export async function listDynamoJobsForAccount(accountId: string) {
  const jobs: DynamoJob[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.AWS_DYNAMO_JOBS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: marshall({
          ":pk": `USER#${accountId}`,
          ":prefix": "JOB#",
        }),
        ExclusiveStartKey: lastEvaluatedKey ? marshall(lastEvaluatedKey) : undefined,
      }),
    );

    for (const item of response.Items ?? []) {
      jobs.push(parseJob(unmarshall(item)));
    }

    lastEvaluatedKey = response.LastEvaluatedKey
      ? unmarshall(response.LastEvaluatedKey)
      : undefined;
  } while (lastEvaluatedKey);

  const tasksByJobId = new Map<string, DynamoTask[]>();
  let lastTaskKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.AWS_DYNAMO_TASKS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: marshall({
          ":pk": `USER#${accountId}`,
          ":prefix": "TASK#",
        }),
        ExclusiveStartKey: lastTaskKey ? marshall(lastTaskKey) : undefined,
      }),
    );

    for (const item of response.Items ?? []) {
      const task = parseTask(unmarshall(item));
      if (!task.requestId) {
        continue;
      }

      const existing = tasksByJobId.get(task.requestId);
      if (existing) {
        existing.push(task);
      } else {
        tasksByJobId.set(task.requestId, [task]);
      }
    }

    lastTaskKey = response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : undefined;
  } while (lastTaskKey);

  const derivedJobs = jobs.map((job) => applyDerivedJobStats(job, tasksByJobId.get(job.jobId) ?? []));

  derivedJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return derivedJobs;
}

export async function listDynamoTasksForJob(accountId: string, jobId: string) {
  void accountId;

  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: env.AWS_DYNAMO_TASKS_TABLE,
      IndexName: env.AWS_DYNAMO_TASKS_BY_REQUEST_INDEX,
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
      ExpressionAttributeValues: marshall({
        ":pk": `JOB#${jobId}`,
        ":prefix": "TASK#",
      }),
    }),
  );

  const tasks = (response.Items ?? []).map((item) => parseTask(unmarshall(item)));
  tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return tasks;
}
