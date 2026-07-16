"use server";

import {
  SegmentationClient,
  type JobDownload,
  type JobRequest,
  type JobResponse,
  type JobStatus,
  type OutputManifest,
  type PresignRequest,
  type PresignResponse,
} from "@segmentationapi/sdk";
import { ensureActiveApiKeyForUser } from "@/lib/server/api-key-management";
import { requirePageSession } from "@/lib/server/page-auth";

async function createAuthenticatedSegmentationClient() {
  const session = await requirePageSession();
  const activeApiKey = await ensureActiveApiKeyForUser(session.user.id);
  return SegmentationClient.create(activeApiKey);
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

export async function createJobDownload(jobId: string): Promise<JobDownload> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  return segmentationClient.createJobDownload(jobId);
}

export async function getJobDownload(jobId: string): Promise<JobDownload> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  return segmentationClient.getJobDownload(jobId);
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

export async function createPlaygroundJob(request: JobRequest): Promise<JobResponse> {
  const segmentationClient = await createAuthenticatedSegmentationClient();
  return segmentationClient.createPlaygroundJob(request);
}
