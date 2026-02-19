import { db } from "@segmentation/db";
import { apiKey } from "@segmentation/db/schema/app";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { putDynamoApiKey } from "@/lib/server/aws/dynamo";
import { requireRouteUser } from "@/lib/server/route-auth";

function generateApiKeySecret() {
  const random = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;

  return `sam3_${random}`;
}

function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function GET(request: Request) {
  const context = await requireRouteUser(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      createdAt: apiKey.createdAt,
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      label: apiKey.label,
      revoked: apiKey.revoked,
      revokedAt: apiKey.revokedAt,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, context.userId))
    .orderBy(desc(apiKey.createdAt));

  return NextResponse.json({
    keys,
  });
}

export async function POST(request: Request) {
  const context = await requireRouteUser(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    label?: string;
  } | null;

  const label = body?.label?.trim() || "Primary key";

  const plainTextKey = generateApiKeySecret();
  const keyHash = hashApiKey(plainTextKey);
  const keyPrefix = plainTextKey.slice(0, 8);
  const keyId = `key_${crypto.randomUUID()}`;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(apiKey).values({
        id: keyId,
        keyHash,
        keyPrefix,
        label,
        revoked: false,
        userId: context.userId,
      });

      await putDynamoApiKey({
        accountId: context.userId,
        keyHash,
        keyId,
        keyPrefix,
        revoked: false,
      });
    });
  } catch (error) {
    console.error("Failed to create API key", error);

    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  const [createdKey] = await db
    .select({
      createdAt: apiKey.createdAt,
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      label: apiKey.label,
      revoked: apiKey.revoked,
      revokedAt: apiKey.revokedAt,
    })
    .from(apiKey)
    .where(and(eq(apiKey.userId, context.userId), eq(apiKey.id, keyId)))
    .limit(1);

  return NextResponse.json({
    apiKey: createdKey,
    plainTextKey,
  });
}
