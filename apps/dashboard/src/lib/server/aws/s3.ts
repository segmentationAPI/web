import { env } from "@segmentation/env/dashboard";

export function buildAssetUrl(s3Path: string | null) {
  if (!s3Path) {
    return null;
  }

  const baseUrl = env.AWS_CLOUDFRONT_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = s3Path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

export async function fetchAssetJson<T>(s3Path: string | null): Promise<T | null> {
  const url = buildAssetUrl(s3Path);
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
