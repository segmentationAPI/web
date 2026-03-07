"use server";

import { db } from "@segmentation/db";
import { user } from "@segmentation/db/schema/auth";
import { eq } from "drizzle-orm";
import {
  SegmentationClient,
  type JobRequest,
  type JobResponse,
  type JobStatus,
  type OutputManifest,
  type PresignRequest,
  type PresignResponse,
} from "@segmentationapi/sdk";
import { requirePageSession } from "@/lib/server/page-auth";

async function createAuthenticatedSegmentationClient() {
  const session = await requirePageSession();

  const results = await db
    .select({ apiKey: user.activeApiKey })
    .from(user)
    .where(eq(user.id, session.user.id));
  const result = results.at(0);

  if (!result?.apiKey) {
    throw new Error("No active API key found for user");
  }

  return SegmentationClient.create(result.apiKey);
}

export async function setUserApiKey(apiKey: string) {
  const session = await requirePageSession();
  const userId = session.user.id;

  await db
    .update(user)
    .set({
      activeApiKey: apiKey,
    })
    .where(eq(user.id, userId));
}

export async function createJob(jobRequest: JobRequest): Promise<JobResponse> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  const job = await segmentationClient.createJob(jobRequest);
  return job;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  return segmentationClient.getJobStatus(jobId);
}

export async function createPresignRequest(
  presignRequest: PresignRequest,
): Promise<PresignResponse> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  const presign = await segmentationClient.presign(presignRequest);
  return presign;
}

export async function getOutputManifest(jobId: string): Promise<OutputManifest> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  return segmentationClient.getOutputManifest(jobId);
}
