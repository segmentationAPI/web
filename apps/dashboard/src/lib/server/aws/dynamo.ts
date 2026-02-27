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
  createdAt: Date;
  updatedAt: Date;
};

export type DynamoTask = {
  accountId: string;
  id: string;
  requestId: string;
  taskType: "image" | "video";
  status: "queued" | "processing" | "success" | "failed";
  inputS3Key: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  masks: Array<{
    maskIndex: number;
    s3Path: string;
    score: number | null;
    box: [number, number, number, number] | null;
  }>;
  videoOutput: {
    framesUrl: string;
    outputS3Prefix: string;
    maskEncoding: string;
    framesProcessed: number;
    framesWithMasks: number;
    totalMasks: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
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

function parseJob(item: Record<string, unknown>): DynamoJob {
  return {
    accountId: String(item.accountId ?? ""),
    jobId: String(item.jobId ?? item.id ?? ""),
    requestType: String(item.request_type ?? "image_batch") as DynamoJob["requestType"],
    status: String(item.status ?? "queued") as DynamoJob["status"],
    prompts: Array.isArray(item.prompts)
      ? item.prompts.map((prompt) => String(prompt)).filter(Boolean)
      : [],
    apiKeyId: toNullableString(item.api_key_id),
    totalTasks: Number(item.total_tasks ?? 0),
    queuedTasks: Number(item.queued_tasks ?? 0),
    processingTasks: Number(item.processing_tasks ?? 0),
    successTasks: Number(item.success_tasks ?? 0),
    failedTasks: Number(item.failed_tasks ?? 0),
    errorCode: toNullableString(item.error_code),
    errorMessage: toNullableString(item.error_message),
    createdAt: toDate(item.created_at),
    updatedAt: toDate(item.updated_at),
  };
}

function parseTask(item: Record<string, unknown>): DynamoTask {
  const masksRaw = Array.isArray(item.masks) ? item.masks : [];
  const masks = masksRaw
    .filter((mask): mask is Record<string, unknown> => Boolean(mask) && typeof mask === "object")
    .map((mask, index) => ({
      maskIndex: Number(mask.mask_index ?? index),
      s3Path: String(mask.s3_path ?? ""),
      score: mask.score == null ? null : Number(mask.score),
      box: Array.isArray(mask.box) && mask.box.length === 4
        ? (mask.box.map((point) => Number(point)) as [number, number, number, number])
        : null,
    }))
    .filter((mask) => mask.s3Path.length > 0)
    .sort((a, b) => a.maskIndex - b.maskIndex);

  const videoOutputRaw =
    item.video_output && typeof item.video_output === "object"
      ? (item.video_output as Record<string, unknown>)
      : null;

  const videoOutput =
    videoOutputRaw &&
    typeof videoOutputRaw.frames_url === "string" &&
    typeof videoOutputRaw.output_s3_prefix === "string"
      ? {
          framesUrl: videoOutputRaw.frames_url,
          outputS3Prefix: videoOutputRaw.output_s3_prefix,
          maskEncoding: typeof videoOutputRaw.mask_encoding === "string"
            ? videoOutputRaw.mask_encoding
            : "coco_rle",
          framesProcessed: Number(videoOutputRaw.frames_processed ?? 0),
          framesWithMasks: Number(videoOutputRaw.frames_with_masks ?? 0),
          totalMasks: Number(videoOutputRaw.total_masks ?? 0),
        }
      : null;

  return {
    accountId: String(item.accountId ?? ""),
    id: String(item.taskId ?? item.id ?? ""),
    requestId: String(item.request_id ?? ""),
    taskType: String(item.task_type ?? "image") as DynamoTask["taskType"],
    status: String(item.status ?? "queued") as DynamoTask["status"],
    inputS3Key: toNullableString(item.input_s3_key),
    errorCode: toNullableString(item.error_code),
    errorMessage: toNullableString(item.error_message),
    masks,
    videoOutput,
    createdAt: toDate(item.created_at),
    updatedAt: toDate(item.updated_at),
  };
}

export async function getDynamoTokenBalance(accountId: string) {
  const command = new GetItemCommand({
    TableName: env.AWS_DYNAMO_BALANCE_TABLE,
    Key: marshall({ accountId }),
  });

  const response = await dynamoClient.send(command);

  if (!response.Item) {
    return 0;
  }

  const parsed = unmarshall(response.Item) as {
    accountId: string;
    tokensRemaining?: number;
  };

  return Number(parsed.tokensRemaining ?? 0);
}

export async function incrementDynamoTokenBalance(accountId: string, tokensToAdd: number) {
  const command = new UpdateItemCommand({
    TableName: env.AWS_DYNAMO_BALANCE_TABLE,
    Key: marshall({ accountId }),
    UpdateExpression: "ADD tokensRemaining :tokens",
    ExpressionAttributeValues: marshall({
      ":tokens": tokensToAdd,
    }),
    ReturnValues: "UPDATED_NEW",
  });

  const response = await dynamoClient.send(command);

  if (!response.Attributes) {
    return null;
  }

  const parsed = unmarshall(response.Attributes) as {
    tokensRemaining?: number;
  };

  return Number(parsed.tokensRemaining ?? 0);
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
      Key: marshall({ accountId, jobId }),
    }),
  );

  if (!response.Item) {
    return null;
  }

  return parseJob(unmarshall(response.Item));
}

export async function listDynamoJobsForAccount(accountId: string) {
  const jobs: DynamoJob[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.AWS_DYNAMO_JOBS_TABLE,
        KeyConditionExpression: "#accountId = :accountId",
        ExpressionAttributeNames: {
          "#accountId": "accountId",
        },
        ExpressionAttributeValues: marshall({
          ":accountId": accountId,
        }),
        ExclusiveStartKey: lastEvaluatedKey ? marshall(lastEvaluatedKey) : undefined,
      }),
    );

    for (const item of response.Items ?? []) {
      jobs.push(parseJob(unmarshall(item)));
    }

    lastEvaluatedKey = response.LastEvaluatedKey ? unmarshall(response.LastEvaluatedKey) : undefined;
  } while (lastEvaluatedKey);

  jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return jobs;
}

export async function listDynamoTasksForJob(accountId: string, jobId: string) {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: env.AWS_DYNAMO_TASKS_TABLE,
      IndexName: env.AWS_DYNAMO_TASKS_BY_REQUEST_INDEX,
      KeyConditionExpression: "#requestKey = :requestKey",
      ExpressionAttributeNames: {
        "#requestKey": "requestKey",
      },
      ExpressionAttributeValues: marshall({
        ":requestKey": `${accountId}#${jobId}`,
      }),
    }),
  );

  const tasks = (response.Items ?? []).map((item) => parseTask(unmarshall(item)));
  tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return tasks;
}
