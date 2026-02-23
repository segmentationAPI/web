import { env } from "@segmentation/env/dashboard";

export function buildAssetUrl(s3Path: string | null) {
  if (!s3Path) {
    return null;
  }

  const baseUrl = env.AWS_CLOUDFRONT_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = s3Path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}
