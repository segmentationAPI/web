import { db } from "@segmentation/db";
import { apiKey } from "@segmentation/db/schema/app";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { setDynamoApiKeyRevoked } from "@/lib/server/aws/dynamo";
import { requireRouteUser } from "@/lib/server/route-auth";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ keyId: string }>;
  },
) {
  const authContext = await requireRouteUser(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await context.params;

  const [existingKey] = await db
    .select({
      id: apiKey.id,
      revoked: apiKey.revoked,
    })
    .from(apiKey)
    .where(and(eq(apiKey.userId, authContext.userId), eq(apiKey.id, keyId)))
    .limit(1);

  if (!existingKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (existingKey.revoked) {
    return NextResponse.json({ ok: true });
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(apiKey)
        .set({
          revoked: true,
          revokedAt: new Date(),
        })
        .where(and(eq(apiKey.userId, authContext.userId), eq(apiKey.id, keyId)));

      await setDynamoApiKeyRevoked({
        keyId,
        revoked: true,
      });
    });
  } catch (error) {
    console.error("Failed to revoke API key", error);

    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
