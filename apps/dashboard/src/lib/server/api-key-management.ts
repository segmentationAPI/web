import "server-only";

import { db } from "@segmentation/db";
import { apiKey, type ApiKey } from "@segmentation/db/schema/app";
import { user } from "@segmentation/db/schema/auth";
import { env } from "@segmentation/env/dashboard";
import { and, eq } from "drizzle-orm";
import { createHmac, randomBytes, randomUUID } from "node:crypto";

import { isDynamoApiKeyActive, putDynamoApiKey } from "@/lib/server/aws/dynamo";

const DASHBOARD_MANAGED_API_KEY_LABEL = "Dashboard key";
const API_KEY_PREFIX = "sk_live_";

function generateApiKeySecret() {
  return randomBytes(24).toString("hex");
}

function buildApiKeyIdentitySegment(params: { accountId: string; keyId: string }) {
  if (params.accountId.includes(":") || params.keyId.includes(":")) {
    throw new Error("API key identifiers must not contain ':'");
  }

  return `${params.accountId}:${params.keyId}`;
}

function buildPlainTextApiKey(params: { accountId: string; keyId: string }) {
  const keySecret = generateApiKeySecret();
  const identitySegment = buildApiKeyIdentitySegment({
    accountId: params.accountId,
    keyId: params.keyId,
  });

  return `${API_KEY_PREFIX}${identitySegment}_${keySecret}`;
}

function hashApiKey(secret: string) {
  return createHmac("sha256", env.API_KEY_HMAC_SECRET).update(secret).digest("hex");
}

export function getApiKeyIdFromPlainTextKey(plainTextKey: string) {
  if (!plainTextKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const body = plainTextKey.slice(API_KEY_PREFIX.length);
  const secretSeparatorIndex = body.lastIndexOf("_");

  if (secretSeparatorIndex === -1) {
    return null;
  }

  const identitySegment = body.slice(0, secretSeparatorIndex);
  const accountSeparatorIndex = identitySegment.indexOf(":");

  if (accountSeparatorIndex === -1) {
    return null;
  }

  return identitySegment.slice(accountSeparatorIndex + 1) || null;
}

export async function createApiKeyForUser(params: {
  label: string;
  makeActive?: boolean;
  userId: string;
}): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  const keyId = `key_${randomUUID()}`;
  const plainTextKey = buildPlainTextApiKey({
    accountId: params.userId,
    keyId,
  });
  const keyHash = hashApiKey(plainTextKey);

  await db.insert(apiKey).values({
    id: keyId,
    keyHash,
    keyPrefix: keyId,
    label: params.label,
    revoked: false,
    userId: params.userId,
  });

  try {
    await putDynamoApiKey({
      accountId: params.userId,
      keyHash,
      keyId,
      keyPrefix: keyId,
      revoked: false,
    });
  } catch (dynamoError) {
    try {
      await db.delete(apiKey).where(and(eq(apiKey.userId, params.userId), eq(apiKey.id, keyId)));
    } catch (cleanupError) {
      console.error("Failed to cleanup API key after Dynamo write error", cleanupError);
    }

    throw dynamoError;
  }

  if (params.makeActive) {
    await db
      .update(user)
      .set({
        activeApiKey: plainTextKey,
      })
      .where(eq(user.id, params.userId));
  }

  const [createdKey] = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.userId, params.userId), eq(apiKey.id, keyId)))
    .limit(1);

  if (!createdKey) {
    throw new Error("Failed to load created API key");
  }

  return {
    apiKey: createdKey,
    plainTextKey,
  };
}

export async function ensureActiveApiKeyForUser(userId: string) {
  const [existingUser] = await db
    .select({ activeApiKey: user.activeApiKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (existingUser?.activeApiKey) {
    const keyId = getApiKeyIdFromPlainTextKey(existingUser.activeApiKey);
    const keyHash = hashApiKey(existingUser.activeApiKey);

    if (keyId) {
      const [existingKey] = await db
        .select({ id: apiKey.id })
        .from(apiKey)
        .where(
          and(
            eq(apiKey.id, keyId),
            eq(apiKey.userId, userId),
            eq(apiKey.keyHash, keyHash),
            eq(apiKey.revoked, false),
          ),
        )
        .limit(1);

      if (
        existingKey &&
        (await isDynamoApiKeyActive({
          accountId: userId,
          keyHash,
          keyId,
        }))
      ) {
        return existingUser.activeApiKey;
      }
    }
  }

  const created = await createApiKeyForUser({
    label: DASHBOARD_MANAGED_API_KEY_LABEL,
    makeActive: true,
    userId,
  });

  return created.plainTextKey;
}
