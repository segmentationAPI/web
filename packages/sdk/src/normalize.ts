import type {
  BatchSegmentAcceptedRaw,
  BatchSegmentAcceptedResult,
  PresignedUploadRaw,
  PresignedUploadResult,
  SegmentJobAcceptedRaw,
  SegmentJobAcceptedResult,
  SegmentJobStatusRaw,
  SegmentJobStatusResult,
  SegmentMaskRaw,
  SegmentResponseRaw,
  SegmentResult,
} from "./types";

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/g, "");
  const normalizedPath = path.replace(/^\/+/g, "");
  return `${normalizedBase}/${normalizedPath}`;
}

export function normalizePresignedUpload(raw: PresignedUploadRaw): PresignedUploadResult {
  return {
    uploadUrl: raw.uploadUrl,
    inputS3Key: raw.inputS3Key,
    bucket: raw.bucket,
    expiresIn: raw.expiresIn,
    raw,
  };
}

export function normalizeSegment(raw: SegmentResponseRaw, assetsBaseUrl: string): SegmentResult {
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

export function normalizeSegmentJobAccepted(raw: SegmentJobAcceptedRaw): SegmentJobAcceptedResult {
  return {
    requestId: raw.requestId ?? raw.request_id ?? "",
    jobId: raw.job_id,
    type: raw.type,
    status: raw.status,
    totalItems: raw.total_items,
    pollPath: raw.poll_path,
    raw,
  };
}

export function normalizeBatchSegmentAccepted(
  raw: BatchSegmentAcceptedRaw,
): BatchSegmentAcceptedResult {
  const base = normalizeSegmentJobAccepted(raw);
  return {
    ...base,
    type: "image_batch",
    raw,
  };
}

export function normalizeSegmentJobStatus(
  raw: SegmentJobStatusRaw,
  assetsBaseUrl: string,
): SegmentJobStatusResult {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        jobId: item.jobId,
        inputS3Key: item.inputS3Key,
        status: item.status,
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
      }))
    : undefined;

  const video = raw.video
    ? {
        jobId: raw.video.jobId,
        inputS3Key: raw.video.inputS3Key,
        status: raw.video.status,
        output: raw.video.output
          ? {
              manifestUrl: raw.video.output.manifest_url,
              framesUrl: raw.video.output.frames_url,
              outputS3Prefix: raw.video.output.output_s3_prefix,
              maskEncoding: raw.video.output.mask_encoding,
            }
          : undefined,
        counts: raw.video.counts
          ? {
              framesProcessed: raw.video.counts.frames_processed,
              framesWithMasks: raw.video.counts.frames_with_masks,
              totalMasks: raw.video.counts.total_masks,
            }
          : undefined,
        error: raw.video.error ?? undefined,
        errorCode: raw.video.error_code ?? undefined,
      }
    : undefined;

  return {
    requestId: raw.requestId ?? raw.request_id ?? "",
    jobId: raw.job_id,
    type: raw.type,
    status: raw.status,
    totalItems: raw.total_items,
    queuedItems: raw.queued_items,
    processingItems: raw.processing_items,
    successItems: raw.success_items,
    failedItems: raw.failed_items,
    items,
    video,
    error: raw.error,
    errorCode: raw.error_code,
    raw,
  };
}
