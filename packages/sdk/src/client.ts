import type { ZodMiniType } from "zod/mini";
import { NetworkError, SegmentationApiError, UploadError } from "./errors";
import {
  segmentJobAcceptedRawSchema,
  segmentJobStatusRawSchema,
  batchSegmentAcceptedRawSchema,
  apiErrorBodySchema,
  createBatchSegmentJobRequestSchema,
  createPresignedUploadRequestSchema,
  getSegmentJobRequestSchema,
  parseInputOrThrow,
  parseResponseOrThrow,
  presignedUploadRawSchema,
  responseBodyRecordSchema,
  segmentationClientOptionsSchema,
  segmentRequestSchema,
  segmentResponseRawSchema,
  segmentVideoRequestSchema,
  uploadAndSegmentRequestSchema,
  uploadImageRequestSchema,
} from "./validation";
import type {
  BatchSegmentAcceptedResult,
  BinaryData,
  CreateBatchSegmentJobRequest,
  CreatePresignedUploadRequest,
  FetchFunction,
  GetSegmentJobRequest,
  SegmentJobAcceptedRaw,
  SegmentJobStatusRaw,
  SegmentResponseRaw,
  PresignedUploadResult,
  ResponseBody,
  SegmentJobStatusResult,
  SegmentRequest,
  SegmentResult,
  SegmentVideoAcceptedResult,
  SegmentVideoRequest,
  SegmentationClientOptions,
  UploadAndSegmentRequest,
  UploadImageRequest,
} from "./types";

const DEFAULT_BASE_URL = "https://api.segmentationapi.com/v1";
const DEFAULT_BASE_URL_JWT = "https://api.segmentationapi.com/v1/jwt";
const DEFAULT_ASSETS_BASE_URL = "https://assets.segmentationapi.com";

type ClientAuth = { kind: "apiKey"; value: string } | { kind: "jwt"; value: string };

function getFetchImplementation(fetchImpl?: FetchFunction): FetchFunction {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("No fetch implementation found. Provide one in SegmentationClient options.");
}

function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/g, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/g, "");
  const normalizedPath = path.replace(/^\/+/g, "");
  return `${normalizedBase}/${normalizedPath}`;
}

function toUploadBody(data: BinaryData): Blob | ArrayBuffer {
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data;
  }

  if (data instanceof Uint8Array) {
    // Copy into a plain ArrayBuffer to satisfy strict BodyInit typing in DTS builds.
    return new Uint8Array(data).buffer;
  }

  throw new TypeError("Unsupported upload data type.");
}

function inferContentType(data: BinaryData): string | undefined {
  if (typeof Blob !== "undefined" && data instanceof Blob && data.type) {
    return data.type;
  }
  return undefined;
}

function normalizePrompts(prompts: string[] | undefined): string[] | undefined {
  if (!prompts) {
    return undefined;
  }

  const trimmed = prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0);
  return trimmed.length > 0 ? trimmed : undefined;
}

async function readResponseBody(response: Response): Promise<ResponseBody> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    const parsedObject = responseBodyRecordSchema.safeParse(parsed);
    return parsedObject.success ? parsedObject.data : text;
  } catch {
    return text;
  }
}

function extractRequestId(response: Response, body: ResponseBody): string | undefined {
  const headerRequestId =
    response.headers.get("x-request-id") ?? response.headers.get("x-amzn-requestid");
  if (headerRequestId) {
    return headerRequestId;
  }

  const parsed = apiErrorBodySchema.safeParse(body);
  if (parsed.success) {
    if (parsed.data.requestId) {
      return parsed.data.requestId;
    }
  }

  return undefined;
}

function buildPresignedUploadResult(raw: PresignedUploadResult["raw"]): PresignedUploadResult {
  return {
    uploadUrl: raw.uploadUrl,
    inputS3Key: raw.inputS3Key,
    bucket: raw.bucket,
    expiresIn: raw.expiresIn,
    raw,
  };
}

function buildSegmentResult(raw: SegmentResponseRaw, assetsBaseUrl: string): SegmentResult {
  return {
    requestId: raw.requestId ?? "",
    jobId: raw.jobId,
    numInstances: raw.numInstances,
    outputPrefix: raw.outputPrefix,
    outputUrl: joinUrl(assetsBaseUrl, raw.outputPrefix),
    masks: raw.masks.map((mask) => ({
      key: mask.key,
      score: mask.score,
      box: mask.box,
      url: joinUrl(assetsBaseUrl, mask.key),
    })),
    raw,
  };
}

function buildSegmentJobAcceptedResult(
  raw: SegmentJobAcceptedRaw,
): SegmentVideoAcceptedResult | BatchSegmentAcceptedResult {
  return {
    requestId: raw.requestId ?? "",
    jobId: raw.jobId,
    type: raw.type,
    status: raw.status,
    totalItems: raw.totalItems,
    pollPath: raw.pollPath,
    raw,
  };
}

function buildSegmentJobStatusResult(
  raw: SegmentJobStatusRaw,
  assetsBaseUrl: string,
): SegmentJobStatusResult {
  return {
    requestId: raw.requestId ?? "",
    jobId: raw.jobId,
    type: raw.type,
    status: raw.status,
    totalItems: raw.totalItems,
    queuedItems: raw.queuedItems,
    processingItems: raw.processingItems,
    successItems: raw.successItems,
    failedItems: raw.failedItems,
    items: raw.items?.map((item) => ({
      jobId: item.jobId,
      inputS3Key: item.inputS3Key,
      status: item.status,
      numInstances: item.numInstances ?? undefined,
      masks: item.masks?.map((mask) => ({
        key: mask.key,
        score: mask.score ?? undefined,
        box: mask.box ?? undefined,
        url: joinUrl(assetsBaseUrl, mask.key),
      })),
      error: item.error ?? undefined,
      errorCode: item.errorCode ?? undefined,
    })),
    video: raw.video
      ? {
          jobId: raw.video.jobId,
          inputS3Key: raw.video.inputS3Key,
          status: raw.video.status,
          output: raw.video.output
            ? {
                framesUrl: raw.video.output.framesUrl,
                outputS3Prefix: raw.video.output.outputS3Prefix,
                maskEncoding: raw.video.output.maskEncoding,
              }
            : undefined,
          counts: raw.video.counts
            ? {
                framesProcessed: raw.video.counts.framesProcessed,
                framesWithMasks: raw.video.counts.framesWithMasks,
                totalMasks: raw.video.counts.totalMasks,
              }
            : undefined,
          error: raw.video.error ?? undefined,
          errorCode: raw.video.errorCode ?? undefined,
        }
      : undefined,
    error: raw.error,
    errorCode: raw.errorCode,
    raw,
  };
}

export class SegmentationClient {
  private readonly auth: ClientAuth;
  private readonly baseUrl: string;
  private readonly assetsBaseUrl: string;
  private readonly fetchImpl: FetchFunction;

  constructor(options: SegmentationClientOptions) {
    const parsedOptions = parseInputOrThrow(
      segmentationClientOptionsSchema,
      options,
      "SegmentationClient.constructor",
    );

    if (parsedOptions.apiKey !== undefined) {
      this.auth = { kind: "apiKey", value: parsedOptions.apiKey };
    } else {
      this.auth = { kind: "jwt", value: parsedOptions.jwt! };
    }
    this.baseUrl = this.auth.kind === "jwt" ? DEFAULT_BASE_URL_JWT : DEFAULT_BASE_URL;
    this.assetsBaseUrl = DEFAULT_ASSETS_BASE_URL;
    this.fetchImpl = getFetchImplementation(parsedOptions.fetch);
  }

  async createPresignedUpload(input: CreatePresignedUploadRequest): Promise<PresignedUploadResult> {
    const parsedInput = parseInputOrThrow(
      createPresignedUploadRequestSchema,
      input,
      "createPresignedUpload",
    );

    const raw = await this.requestApi({
      path: "/uploads/presign",
      headers: {
        "content-type": parsedInput.contentType,
      },
      signal: parsedInput.signal,
      responseSchema: presignedUploadRawSchema,
      operation: "createPresignedUpload",
    });

    return buildPresignedUploadResult(raw);
  }

  async uploadImage(input: UploadImageRequest): Promise<void> {
    const parsedInput = parseInputOrThrow(uploadImageRequestSchema, input, "uploadImage");

    const headers = new Headers();
    const contentType = parsedInput.contentType ?? inferContentType(parsedInput.data);
    if (contentType) {
      headers.set("Content-Type", contentType);
    }

    const requestInit: RequestInit = {
      method: "PUT",
      headers,
      body: toUploadBody(parsedInput.data),
      signal: parsedInput.signal,
    };

    let response: Response;
    try {
      response = await this.fetchImpl(parsedInput.uploadUrl, requestInit);
    } catch (error) {
      throw new NetworkError("Upload failed due to a network error.", {
        context: "upload",
        cause: error,
      });
    }

    if (!response.ok) {
      const body = await readResponseBody(response);
      throw new UploadError(`Upload failed with status ${response.status}.`, {
        status: response.status,
        url: parsedInput.uploadUrl,
        body,
      });
    }
  }

  async segment(input: SegmentRequest): Promise<SegmentResult> {
    const parsedInput = parseInputOrThrow(segmentRequestSchema, input, "segment");
    const prompts = normalizePrompts(parsedInput.prompts);

    const raw = await this.requestApi({
      path: "/segment",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...(prompts ? { prompts } : {}),
        inputS3Key: parsedInput.inputS3Key,
        threshold: parsedInput.threshold,
        maskThreshold: parsedInput.maskThreshold,
      }),
      signal: parsedInput.signal,
      responseSchema: segmentResponseRawSchema,
      operation: "segment",
    });

    return buildSegmentResult(raw, this.assetsBaseUrl);
  }

  async segmentVideo(input: SegmentVideoRequest): Promise<SegmentVideoAcceptedResult> {
    const parsedInput = parseInputOrThrow(segmentVideoRequestSchema, input, "segmentVideo");

    const contentType = inferContentType(parsedInput.file) ?? "application/octet-stream";
    const presignedUpload = await this.createPresignedUpload({
      contentType,
      signal: parsedInput.signal,
    });

    await this.uploadImage({
      uploadUrl: presignedUpload.uploadUrl,
      data: parsedInput.file,
      contentType,
      signal: parsedInput.signal,
    });

    const requestBody: Record<string, unknown> = {
      inputS3Key: presignedUpload.inputS3Key,
      frameIdx: parsedInput.frameIdx ?? 0,
    };

    if (parsedInput.fps !== undefined) {
      requestBody.fps = parsedInput.fps;
    }
    if (parsedInput.numFrames !== undefined) {
      requestBody.numFrames = parsedInput.numFrames;
    }
    if (parsedInput.maxFrames !== undefined) {
      requestBody.maxFrames = parsedInput.maxFrames;
    }

    if (parsedInput.points !== undefined) {
      requestBody.points = parsedInput.points;
      if (parsedInput.pointLabels !== undefined) {
        requestBody.pointLabels = parsedInput.pointLabels;
      }
      if (parsedInput.pointObjectIds !== undefined) {
        requestBody.pointObjectIds = parsedInput.pointObjectIds;
      }
    } else {
      requestBody.boxes = parsedInput.boxes;
      if (parsedInput.boxObjectIds !== undefined) {
        requestBody.boxObjectIds = parsedInput.boxObjectIds;
      }
    }

    const raw = await this.requestApi({
      path: "/segment/video",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: parsedInput.signal,
      responseSchema: segmentJobAcceptedRawSchema,
      operation: "segmentVideo",
    });

    return {
      ...buildSegmentJobAcceptedResult(raw),
      type: "video",
    };
  }

  async uploadAndSegment(input: UploadAndSegmentRequest): Promise<SegmentResult> {
    const parsedInput = parseInputOrThrow(uploadAndSegmentRequestSchema, input, "uploadAndSegment");
    const prompts = normalizePrompts(parsedInput.prompts);

    const presignedUpload = await this.createPresignedUpload({
      contentType: parsedInput.contentType,
      signal: parsedInput.signal,
    });

    await this.uploadImage({
      uploadUrl: presignedUpload.uploadUrl,
      data: parsedInput.data,
      contentType: parsedInput.contentType,
      signal: parsedInput.signal,
    });

    return this.segment({
      ...(prompts ? { prompts } : {}),
      inputS3Key: presignedUpload.inputS3Key,
      threshold: parsedInput.threshold,
      maskThreshold: parsedInput.maskThreshold,
      signal: parsedInput.signal,
    });
  }

  async createBatchSegmentJob(
    input: CreateBatchSegmentJobRequest,
  ): Promise<BatchSegmentAcceptedResult> {
    const parsedInput = parseInputOrThrow(
      createBatchSegmentJobRequestSchema,
      input,
      "createBatchSegmentJob",
    );
    const prompts = normalizePrompts(parsedInput.prompts);

    const raw = await this.requestApi({
      path: "/segment/batch",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...(prompts ? { prompts } : {}),
        threshold: parsedInput.threshold,
        maskThreshold: parsedInput.maskThreshold,
        items: parsedInput.items,
      }),
      signal: parsedInput.signal,
      responseSchema: batchSegmentAcceptedRawSchema,
      operation: "createBatchSegmentJob",
    });

    return {
      ...buildSegmentJobAcceptedResult(raw),
      type: "image_batch",
    };
  }

  async getSegmentJob(input: GetSegmentJobRequest): Promise<SegmentJobStatusResult> {
    const parsedInput = parseInputOrThrow(getSegmentJobRequestSchema, input, "getSegmentJob");

    const raw = await this.requestApi({
      path: `/jobs/${encodeURIComponent(parsedInput.jobId)}`,
      method: "GET",
      signal: parsedInput.signal,
      responseSchema: segmentJobStatusRawSchema,
      operation: "getSegmentJob",
    });

    return buildSegmentJobStatusResult(raw, this.assetsBaseUrl);
  }

  private async requestApi<TPayload>(input: {
    path: string;
    body?: BodyInit;
    headers?: HeadersInit;
    method?: string;
    signal?: AbortSignal;
    responseSchema: ZodMiniType<TPayload>;
    operation: string;
  }): Promise<TPayload> {
    const headers = new Headers(input.headers);
    if (this.auth.kind === "apiKey") {
      headers.set("x-api-key", this.auth.value);
    } else {
      headers.set("authorization", `Bearer ${this.auth.value}`);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(buildApiUrl(this.baseUrl, input.path), {
        method: input.method ?? "POST",
        headers,
        body: input.body,
        signal: input.signal,
      });
    } catch (error) {
      throw new NetworkError("API request failed due to a network error.", {
        context: "api",
        cause: error,
      });
    }

    const parsedBody = await readResponseBody(response);
    if (!response.ok) {
      throw new SegmentationApiError(`API request failed with status ${response.status}.`, {
        status: response.status,
        body: parsedBody,
        requestId: extractRequestId(response, parsedBody),
      });
    }

    return parseResponseOrThrow(input.responseSchema, parsedBody, input.operation);
  }
}
