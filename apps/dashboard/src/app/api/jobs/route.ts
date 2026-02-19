import { db } from "@segmentation/db";
import { apiKey, requestJob } from "@segmentation/db/schema/app";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { DEFAULT_PAGE_SIZE } from "@/lib/server/constants";
import { requireRouteUser } from "@/lib/server/route-auth";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: Request) {
  const context = await requireRouteUser(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const offset = parsePositiveInt(url.searchParams.get("offset"), 0);
  const limit = Math.min(parsePositiveInt(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE), 100);

  const jobs = await db
    .select({
      apiKeyId: requestJob.apiKeyId,
      apiKeyPrefix: apiKey.keyPrefix,
      createdAt: requestJob.createdAt,
      id: requestJob.id,
      prompt: requestJob.prompt,
      requestId: requestJob.requestId,
      status: requestJob.status,
    })
    .from(requestJob)
    .leftJoin(apiKey, eq(requestJob.apiKeyId, apiKey.id))
    .where(and(eq(requestJob.userId, context.userId)))
    .orderBy(desc(requestJob.createdAt), desc(requestJob.id))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    items: jobs,
    nextOffset: jobs.length < limit ? null : offset + jobs.length,
  });
}
