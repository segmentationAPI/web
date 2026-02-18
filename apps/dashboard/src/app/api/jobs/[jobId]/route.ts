import { db } from "@segmentation/db";
import { apiKey, requestJob, requestJobOutput } from "@segmentation/db/schema/app";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSignedImageUrl } from "@/lib/server/aws/s3";
import { requireRouteUser } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ jobId: string }>;
  },
) {
  const authContext = await requireRouteUser(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;

  const [job] = await db
    .select({
      apiKeyPrefix: apiKey.keyPrefix,
      createdAt: requestJob.createdAt,
      errorCode: requestJob.errorCode,
      errorMessage: requestJob.errorMessage,
      id: requestJob.id,
      inputBucket: requestJob.inputBucket,
      inputKey: requestJob.inputKey,
      processedAt: requestJob.processedAt,
      requestId: requestJob.requestId,
      status: requestJob.status,
      tokenCost: requestJob.tokenCost,
    })
    .from(requestJob)
    .leftJoin(apiKey, eq(requestJob.apiKeyId, apiKey.id))
    .where(and(eq(requestJob.userId, authContext.userId), eq(requestJob.id, jobId)))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const outputs = await db
    .select({
      bucket: requestJobOutput.bucket,
      height: requestJobOutput.height,
      id: requestJobOutput.id,
      key: requestJobOutput.key,
      mimeType: requestJobOutput.mimeType,
      outputIndex: requestJobOutput.outputIndex,
      width: requestJobOutput.width,
    })
    .from(requestJobOutput)
    .where(eq(requestJobOutput.jobId, job.id))
    .orderBy(asc(requestJobOutput.outputIndex));

  const [inputImageUrl, outputUrls] = await Promise.all([
    getSignedImageUrl({
      bucket: job.inputBucket,
      key: job.inputKey,
    }),
    Promise.all(
      outputs.map(async (output) => ({
        ...output,
        signedUrl: await getSignedImageUrl({
          bucket: output.bucket,
          key: output.key,
        }),
      })),
    ),
  ]);

  return NextResponse.json({
    job: {
      ...job,
      inputImageUrl,
      outputs: outputUrls,
    },
  });
}
