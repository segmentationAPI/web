import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@segmentation/env/server";

import { s3Client } from "./clients";

export async function getSignedImageUrlByKey(key: string | null) {
  if (!key) {
    return null;
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.ASSETS_BUCKET,
      Key: key,
    }),
    {
      expiresIn: env.AWS_S3_SIGNED_URL_TTL_SECONDS,
    },
  );
}

export function buildInputImageKey(params: { imageName: string | null; userId: string }) {
  if (!params.imageName) {
    return null;
  }

  let normalized = params.imageName.trim().replace(/^\/+/, "");

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      normalized = parsed.pathname.replace(/^\/+/, "");
    } catch {
      // Keep original value if URL parsing fails.
    }
  }

  const expectedPrefix = `inputs/${params.userId}/`;

  if (normalized.startsWith(expectedPrefix) || normalized.startsWith("inputs/")) {
    return normalized;
  }

  return `inputs/${params.userId}/${normalized}`;
}

export function buildOutputMaskKey(params: { jobId: string; outputIndex: number; userId: string }) {
  return `outputs/${params.userId}/${params.jobId}/mask_${params.outputIndex}.png`;
}
