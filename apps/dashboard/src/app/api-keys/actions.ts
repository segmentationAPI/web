"use server";

import { db } from "@segmentation/db";
import { apiKey, type ApiKey } from "@segmentation/db/schema/app";
import { env } from "@segmentation/env/dashboard";
import { and, eq } from "drizzle-orm";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { putDynamoApiKey, setDynamoApiKeyRevoked } from "@/lib/server/aws/dynamo";
import { requirePageSession } from "@/lib/server/page-auth";

const createApiKeyPayloadSchema = z.object({
  label: z.string().trim().max(100).optional(),
});

const revokeApiKeyPayloadSchema = z.object({
  keyId: z.string().min(1),
});

type CreateApiKeyActionResult =
  | {
      apiKey: ApiKey;
      ok: true;
      plainTextKey: string;
    }
  | {
      error: string;
      ok: false;
    };

type RevokeApiKeyActionResult =
  | {
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

function generateApiKeySecret() {
  const keyPrefix = randomBytes(8).toString("hex");
  const keySecret = randomBytes(24).toString("hex");

  return {
    keyPrefix,
    plainTextKey: `sk_live_${keyPrefix}_${keySecret}`,
  };
}

function hashApiKey(secret: string) {
  return createHmac("sha256", env.API_KEY_HMAC_SECRET).update(secret).digest("hex");
}

export async function createApiKeyAction(
  input: z.input<typeof createApiKeyPayloadSchema>,
): Promise<CreateApiKeyActionResult> {
  const session = await requirePageSession();
  const parsed = createApiKeyPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid request body",
      ok: false,
    };
  }

  const label = parsed.data.label || "Primary key";
  const { keyPrefix, plainTextKey } = generateApiKeySecret();
  const keyHash = hashApiKey(plainTextKey);
  const keyId = `key_${randomUUID()}`;

  try {
    await db.insert(apiKey).values({
      id: keyId,
      keyHash,
      keyPrefix,
      label,
      revoked: false,
      userId: session.user.id,
    });

    try {
      await putDynamoApiKey({
        accountId: session.user.id,
        keyHash,
        keyId,
        keyPrefix,
        revoked: false,
      });
    } catch (dynamoError) {
      try {
        await db
          .delete(apiKey)
          .where(and(eq(apiKey.userId, session.user.id), eq(apiKey.id, keyId)));
      } catch (cleanupError) {
        console.error("Failed to cleanup API key after Dynamo write error", cleanupError);
      }

      throw dynamoError;
    }
  } catch (error) {
    console.error("Failed to create API key", error);
    return {
      error: "Failed to create API key",
      ok: false,
    };
  }

  const [createdKey] = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.userId, session.user.id), eq(apiKey.id, keyId)))
    .limit(1);

  if (!createdKey) {
    return {
      error: "Failed to load created API key",
      ok: false,
    };
  }

  revalidatePath("/api-keys");

  return {
    apiKey: createdKey,
    ok: true,
    plainTextKey,
  };
}

export async function revokeApiKeyAction(
  input: z.input<typeof revokeApiKeyPayloadSchema>,
): Promise<RevokeApiKeyActionResult> {
  const session = await requirePageSession();
  const parsed = revokeApiKeyPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid request body",
      ok: false,
    };
  }

  const [existingKey] = await db
    .select({
      id: apiKey.id,
      revoked: apiKey.revoked,
    })
    .from(apiKey)
    .where(and(eq(apiKey.userId, session.user.id), eq(apiKey.id, parsed.data.keyId)))
    .limit(1);

  if (!existingKey) {
    return {
      error: "API key not found",
      ok: false,
    };
  }

  if (existingKey.revoked) {
    return {
      ok: true,
    };
  }

  try {
    await setDynamoApiKeyRevoked({
      keyId: parsed.data.keyId,
      revoked: true,
    });

    await db
      .update(apiKey)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(and(eq(apiKey.userId, session.user.id), eq(apiKey.id, parsed.data.keyId)));
  } catch (error) {
    console.error("Failed to revoke API key", error);
    return {
      error: "Failed to revoke API key",
      ok: false,
    };
  }

  revalidatePath("/api-keys");

  return {
    ok: true,
  };
}
