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

function toNullableDate(value: unknown) {
  const parsed = toDate(value);
  return parsed.getTime() === 0 ? null : parsed;
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
