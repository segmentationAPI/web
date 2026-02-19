import { db } from "@segmentation/db";
import { requestJob } from "@segmentation/db/schema/app";
import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDynamoTokenBalance } from "@/lib/server/aws/dynamo";
import { requireRouteUser } from "@/lib/server/route-auth";

export async function GET(request: Request) {
  const context = await requireRouteUser(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [balance, usageRow] = await Promise.all([
    getDynamoTokenBalance(context.userId),
    db
      .select({
        requestCountLast24h: count(requestJob.id),
      })
      .from(requestJob)
      .where(
        and(
          eq(requestJob.userId, context.userId),
          gte(requestJob.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  return NextResponse.json({
    tokenUsageLast24h: Number(usageRow?.requestCountLast24h ?? 0) * 2,
    tokensRemaining: balance,
  });
}
