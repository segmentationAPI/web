"use server";

import { db } from "@segmentation/db";
import { apiKey, type ApiKey } from "@segmentation/db/schema/app";
import { user } from "@segmentation/db/schema/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setDynamoApiKeyRevoked } from "@/lib/server/aws/dynamo";
import { createApiKeyForUser, getApiKeyIdFromPlainTextKey } from "@/lib/server/api-key-management";
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

  try {
    const created = await createApiKeyForUser({
      label,
      makeActive: true,
      userId: session.user.id,
    });

    revalidatePath("/");
    revalidatePath("/api-keys");
    revalidatePath("/history");
    revalidatePath("/studio");

    return {
      apiKey: created.apiKey,
      ok: true,
      plainTextKey: created.plainTextKey,
    };
  } catch (error) {
    console.error("Failed to create API key", error);
    return {
      error: "Failed to create API key",
      ok: false,
    };
  }
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
      activeApiKey: user.activeApiKey,
    })
    .from(apiKey)
    .innerJoin(user, eq(user.id, apiKey.userId))
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

    if (getApiKeyIdFromPlainTextKey(existingKey.activeApiKey ?? "") === parsed.data.keyId) {
      await db
        .update(user)
        .set({
          activeApiKey: null,
        })
        .where(eq(user.id, session.user.id));
    }
  } catch (error) {
    console.error("Failed to revoke API key", error);
    return {
      error: "Failed to revoke API key",
      ok: false,
    };
  }

  revalidatePath("/api-keys");
  revalidatePath("/history");
  revalidatePath("/studio");

  return {
    ok: true,
  };
}
