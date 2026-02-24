import type {
  BatchSegmentAcceptedRaw,
  BatchSegmentAcceptedResult,
  BatchSegmentStatusRaw,
  BatchSegmentStatusResult,
  PresignedUploadRaw,
  PresignedUploadResult,
  SegmentMaskRaw,
  SegmentVideoResponseRaw,
  SegmentVideoResult,
  SegmentResponseRaw,
  SegmentResult,
} from "./types";

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/g, "");
  const normalizedPath = path.replace(/^\/+/g, "");
  return `${normalizedBase}/${normalizedPath}`;
}

export function normalizePresignedUpload(
  raw: PresignedUploadRaw,
): PresignedUploadResult {
  return {
    uploadUrl: raw.uploadUrl,
    inputS3Key: raw.inputS3Key,
    bucket: raw.bucket,
    expiresIn: raw.expiresIn,
    raw,
  };
}

export function normalizeSegment(
  raw: SegmentResponseRaw,
  assetsBaseUrl: string,
): SegmentResult {
  const requestId = raw.requestId ?? raw.request_id ?? "";
  const masks = Array.isArray(raw.masks) ? raw.masks : [];

  return {
    requestId,
    jobId: raw.job_id,
    numInstances: raw.num_instances,
    outputPrefix: raw.output_prefix,
    outputUrl: joinUrl(assetsBaseUrl, raw.output_prefix),
    masks: masks.map((mask: SegmentMaskRaw) => ({
      key: mask.key,
      score: mask.score,
      box: mask.box,
      url: joinUrl(assetsBaseUrl, mask.key),
    })),
    raw,
  };
}

export function normalizeSegmentVideo(
  raw: SegmentVideoResponseRaw,
): SegmentVideoResult {
  return {
    requestId: raw.requestId ?? raw.request_id ?? "",
    status: raw.status,
    output: {
      manifestUrl: raw.output.manifest_url,
      framesUrl: raw.output.frames_url,
      outputS3Prefix: raw.output.output_s3_prefix,
      maskEncoding: raw.output.mask_encoding,
    },
    counts: {
      framesProcessed: raw.counts.frames_processed,
      framesWithMasks: raw.counts.frames_with_masks,
      totalMasks: raw.counts.total_masks,
    },
    raw,
  };
}

export function normalizeBatchSegmentAccepted(
  raw: BatchSegmentAcceptedRaw,
): BatchSegmentAcceptedResult {
  return {
    requestId: raw.requestId ?? raw.request_id ?? "",
    jobId: raw.job_id,
    status: raw.status,
    totalItems: raw.total_items,
    pollPath: raw.poll_path,
    raw,
  };
}

export function normalizeBatchSegmentStatus(
  raw: BatchSegmentStatusRaw,
  assetsBaseUrl: string,
): BatchSegmentStatusResult {
  return {
    requestId: raw.requestId ?? raw.request_id ?? "",
    jobId: raw.job_id,
    status: raw.status,
    totalItems: raw.total_items,
    queuedItems: raw.queued_items,
    processingItems: raw.processing_items,
    successItems: raw.success_items,
    failedItems: raw.failed_items,
    items: raw.items.map((item) => ({
      inputS3Key: item.inputS3Key,
      status: item.status,
      outputPrefix: item.output_prefix ?? undefined,
      numInstances: item.num_instances ?? undefined,
      masks: Array.isArray(item.masks)
        ? item.masks.map((mask) => ({
            key: mask.key,
            score: mask.score ?? undefined,
            box: mask.box ?? undefined,
            url: joinUrl(assetsBaseUrl, mask.key),
          }))
        : undefined,
      error: item.error ?? undefined,
      errorCode: item.error_code ?? undefined,
    })),
    raw,
  };
}
