import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@segmentation/env/server";

import { s3Client } from "./clients";

export async function getSignedImageUrl(params: { bucket: string | null; key: string | null }) {
  if (!params.bucket || !params.key) {
    return null;
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    }),
    {
      expiresIn: env.AWS_S3_SIGNED_URL_TTL_SECONDS,
    },
  );
}
