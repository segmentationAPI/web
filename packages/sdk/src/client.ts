import type { ZodMiniType } from "zod/mini";
import { NetworkError, SegmentationApiError, UploadError } from "./errors";
import {
  normalizeBatchSegmentAccepted,
  normalizeBatchSegmentStatus,
  normalizePresignedUpload,
  normalizeSegment,
  normalizeSegmentVideo,
} from "./normalize";
import {
  batchSegmentAcceptedRawSchema,
  batchSegmentStatusRawSchema,
  apiErrorBodySchema,
  createBatchSegmentJobRequestSchema,
  createPresignedUploadRequestSchema,
  getBatchSegmentJobRequestSchema,
  parseInputOrThrow,
  parseResponseOrThrow,
  presignedUploadRawSchema,
  responseBodyRecordSchema,
  segmentationClientOptionsSchema,
  segmentRequestSchema,
  segmentResponseRawSchema,
  segmentVideoRequestSchema,
  segmentVideoResponseRawSchema,
  uploadAndSegmentRequestSchema,
  uploadImageRequestSchema,
} from "./validation";
import type {
  BatchSegmentAcceptedResult,
  BatchSegmentStatusResult,
  BinaryData,
  CreateBatchSegmentJobRequest,
  CreatePresignedUploadRequest,
  FetchFunction,
  GetBatchSegmentJobRequest,
  PresignedUploadResult,
  ResponseBody,
  SegmentRequest,
  SegmentResult,
  SegmentVideoRequest,
  SegmentVideoResult,
  SegmentationClientOptions,
  UploadAndSegmentRequest,
  UploadImageRequest,
} from "./types";

const DEFAULT_BASE_URL = "https://api.segmentationapi.com/v1";
const DEFAULT_BASE_URL_JWT = "https://api.segmentationapi.com/v1/jwt";
const DEFAULT_ASSETS_BASE_URL = "https://assets.segmentationapi.com";

type ClientAuth =
  | { kind: "apiKey"; value: string }
  | { kind: "jwt"; value: string };

function getFetchImplementation(fetchImpl?: FetchFunction): FetchFunction {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error(
    "No fetch implementation found. Provide one in SegmentationClient options.",
  );
}

function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/g, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
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

function toFormDataBlob(data: BinaryData): Blob {
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data;
  }
  if (data instanceof Uint8Array) {
    // Ensure BlobPart uses a plain ArrayBuffer (not ArrayBufferLike / SharedArrayBuffer).
    const copied = new Uint8Array(data.byteLength);
    copied.set(data);
    return new Blob([copied.buffer], { type: "application/octet-stream" });
  }
  throw new TypeError("Unsupported multipart data type.");
}

function inferFilename(data: BinaryData, fallback: string): string {
  if (typeof File !== "undefined" && data instanceof File && data.name) {
    return data.name;
  }
  return fallback;
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

function extractRequestId(
  response: Response,
  body: ResponseBody,
): string | undefined {
  const headerRequestId =
    response.headers.get("x-request-id") ??
    response.headers.get("x-amzn-requestid");
  if (headerRequestId) {
    return headerRequestId;
  }

  const parsed = apiErrorBodySchema.safeParse(body);
  if (parsed.success) {
    if (parsed.data.requestId !== undefined) {
      return parsed.data.requestId;
    }
    if (parsed.data.request_id !== undefined) {
      return parsed.data.request_id;
    }
  }

  return undefined;
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
    this.baseUrl =
      this.auth.kind === "jwt" ? DEFAULT_BASE_URL_JWT : DEFAULT_BASE_URL;
    this.assetsBaseUrl = DEFAULT_ASSETS_BASE_URL;
    this.fetchImpl = getFetchImplementation(parsedOptions.fetch);
  }

  async createPresignedUpload(
    input: CreatePresignedUploadRequest,
  ): Promise<PresignedUploadResult> {
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

    return normalizePresignedUpload(raw);
  }

  async uploadImage(input: UploadImageRequest): Promise<void> {
    const parsedInput = parseInputOrThrow(
      uploadImageRequestSchema,
      input,
      "uploadImage",
    );

    const headers = new Headers();
    const contentType =
      parsedInput.contentType ?? inferContentType(parsedInput.data);
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
    const parsedInput = parseInputOrThrow(
      segmentRequestSchema,
      input,
      "segment",
    );

    const raw = await this.requestApi({
      path: "/segment",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompts: parsedInput.prompts,
        inputS3Key: parsedInput.inputS3Key,
        threshold: parsedInput.threshold,
        mask_threshold: parsedInput.maskThreshold,
      }),
      signal: parsedInput.signal,
      responseSchema: segmentResponseRawSchema,
      operation: "segment",
    });

    return normalizeSegment(raw, this.assetsBaseUrl);
  }

  async segmentVideo(input: SegmentVideoRequest): Promise<SegmentVideoResult> {
    const parsedInput = parseInputOrThrow(
      segmentVideoRequestSchema,
      input,
      "segmentVideo",
    );

    const formData = new FormData();
    formData.append(
      "file",
      toFormDataBlob(parsedInput.file),
      inferFilename(parsedInput.file, "file.bin"),
    );

    if (parsedInput.fps !== undefined) {
      formData.append("fps", String(parsedInput.fps));
    }
    if (parsedInput.numFrames !== undefined) {
      formData.append("num_frames", String(parsedInput.numFrames));
    }
    if (parsedInput.maxFrames !== undefined) {
      formData.append("max_frames", String(parsedInput.maxFrames));
    }

    if (parsedInput.points !== undefined) {
      formData.append("points", JSON.stringify(parsedInput.points));
      if (parsedInput.pointLabels !== undefined) {
        formData.append("point_labels", JSON.stringify(parsedInput.pointLabels));
      }
      if (parsedInput.pointObjectIds !== undefined) {
        formData.append(
          "point_obj_ids",
          JSON.stringify(parsedInput.pointObjectIds),
        );
      }
    } else {
      formData.append("boxes", JSON.stringify(parsedInput.boxes));
      if (parsedInput.boxObjectIds !== undefined) {
        formData.append("box_obj_ids", JSON.stringify(parsedInput.boxObjectIds));
      }
    }

    formData.append("frame_idx", String(parsedInput.frameIdx ?? 0));
    formData.append(
      "clear_old_inputs",
      (parsedInput.clearOldInputs ?? true) ? "true" : "false",
    );

    const raw = await this.requestApi({
      path: "/segment/video",
      body: formData,
      signal: parsedInput.signal,
      responseSchema: segmentVideoResponseRawSchema,
      operation: "segmentVideo",
    });

    return normalizeSegmentVideo(raw);
  }

  async uploadAndSegment(
    input: UploadAndSegmentRequest,
  ): Promise<SegmentResult> {
    const parsedInput = parseInputOrThrow(
      uploadAndSegmentRequestSchema,
      input,
      "uploadAndSegment",
    );

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
      prompts: parsedInput.prompts,
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

    const raw = await this.requestApi({
      path: "/segment/batch",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompts: parsedInput.prompts,
        threshold: parsedInput.threshold,
        mask_threshold: parsedInput.maskThreshold,
        items: parsedInput.items,
      }),
      signal: parsedInput.signal,
      responseSchema: batchSegmentAcceptedRawSchema,
      operation: "createBatchSegmentJob",
    });

    return normalizeBatchSegmentAccepted(raw);
  }

  async getBatchSegmentJob(
    input: GetBatchSegmentJobRequest,
  ): Promise<BatchSegmentStatusResult> {
    const parsedInput = parseInputOrThrow(
      getBatchSegmentJobRequestSchema,
      input,
      "getBatchSegmentJob",
    );

    const raw = await this.requestApi({
      path: `/segment/batch/${encodeURIComponent(parsedInput.jobId)}`,
      method: "GET",
      signal: parsedInput.signal,
      responseSchema: batchSegmentStatusRawSchema,
      operation: "getBatchSegmentJob",
    });

    return normalizeBatchSegmentStatus(raw, this.assetsBaseUrl);
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
      throw new SegmentationApiError(
        `API request failed with status ${response.status}.`,
        {
          status: response.status,
          body: parsedBody,
          requestId: extractRequestId(response, parsedBody),
        },
      );
    }

    return parseResponseOrThrow(
      input.responseSchema,
      parsedBody,
      input.operation,
    );
  }
}
