import { env } from "@segmentation/env/server";

export function buildAssetUrlByKey(key: string | null) {
  if (!key) {
    return null;
  }

  const baseUrl = env.AWS_CLOUDFRONT_BASE_URL.replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedKey}`;
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
