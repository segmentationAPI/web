import { db } from "@segmentation/db";
import { apiKey, requestJob, requestJobOutput } from "@segmentation/db/schema/app";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { buildInputImageKey, buildOutputMaskKey, getSignedImageUrlByKey } from "@/lib/server/aws/s3";
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
      inputImageName: requestJob.inputImageName,
      prompt: requestJob.prompt,
      requestId: requestJob.requestId,
      status: requestJob.status,
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
      outputIndex: requestJobOutput.outputIndex,
    })
    .from(requestJobOutput)
    .where(eq(requestJobOutput.jobId, job.id))
    .orderBy(asc(requestJobOutput.outputIndex));

  const [inputImageUrl, outputUrls] = await Promise.all([
    getSignedImageUrlByKey(
      buildInputImageKey({
        imageName: job.inputImageName,
        userId: authContext.userId,
      }),
    ),
    Promise.all(
      outputs.map(async (output) => ({
        ...output,
        signedUrl: await getSignedImageUrlByKey(
          buildOutputMaskKey({
            jobId: job.id,
            outputIndex: output.outputIndex,
            userId: authContext.userId,
          }),
        ),
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
