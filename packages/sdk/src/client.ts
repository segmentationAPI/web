import type { ZodMiniType } from "zod/mini";
import { NetworkError, SegmentationApiError, UploadError } from "./errors";
import {
  jobAcceptedRawSchema,
  jobStatusRawSchema,
  apiErrorBodySchema,
  createJobRequestSchema,
  createPresignedUploadRequestSchema,
  getSegmentJobRequestSchema,
  parseInputOrThrow,
  parseResponseOrThrow,
  presignedUploadRawSchema,
  responseBodyRecordSchema,
  segmentationClientOptionsSchema,
  segmentVideoRequestSchema,
  uploadAndCreateJobRequestSchema,
  uploadImageRequestSchema,
} from "./validation";
import type {
  BinaryData,
  CreateJobRequest,
  CreatePresignedUploadRequest,
  FetchFunction,
  GetSegmentJobRequest,
  JobAcceptedRaw,
  JobAcceptedResult,
  JobStatusRaw,
  PresignedUploadResult,
  ResponseBody,
  JobStatusResult,
  SegmentVideoRequest,
  SegmentationClientOptions,
  UploadAndCreateJobRequest,
  UploadImageRequest,
} from "./types";

const DEFAULT_BASE_URL = "https://api.segmentationapi.com/v1";
const DEFAULT_BASE_URL_JWT = "https://api.segmentationapi.com/v1/jwt";

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

function normalizePrompts(prompts: string[] | undefined): string[] {
  if (!prompts) {
    return [];
  }
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0);
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
    taskId: raw.taskId,
    bucket: raw.bucket,
    expiresIn: raw.expiresIn,
    raw,
  };
}

function buildJobAcceptedResult(raw: JobAcceptedRaw): JobAcceptedResult {
  return {
    requestId: raw.requestId ?? "",
    jobId: raw.jobId,
    type: raw.type,
    status: raw.status,
    totalItems: raw.totalItems,
    raw,
  };
}

function buildJobStatusResult(
  raw: JobStatusRaw,
): JobStatusResult {
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
      taskId: item.taskId,
      status: item.status,
      error: item.error ?? undefined,
    })),
    error: raw.error,
    raw,
  };
}

export class SegmentationClient {
  private readonly auth: ClientAuth;
  private readonly baseUrl: string;
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

  async segmentVideo(input: SegmentVideoRequest): Promise<JobAcceptedResult> {
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
      type: "video",
      items: [{ taskId: presignedUpload.taskId }],
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
    requestBody.prompts = parsedInput.prompts;

    const raw = await this.requestApi({
      path: "/jobs",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: parsedInput.signal,
      responseSchema: jobAcceptedRawSchema,
      operation: "segmentVideo",
    });

    return buildJobAcceptedResult(raw);
  }

  async createJob(input: CreateJobRequest): Promise<JobAcceptedResult> {
    const parsedInput = parseInputOrThrow(
      createJobRequestSchema,
      input,
      "createJob",
    );
    const prompts = normalizePrompts(parsedInput.prompts);

    const payload: Record<string, unknown> = {
      type: parsedInput.type,
      threshold: parsedInput.threshold,
      maskThreshold: parsedInput.maskThreshold,
      items: parsedInput.items,
    };
    if (prompts.length > 0) {
      payload.prompts = prompts;
    }
    if (parsedInput.boxes !== undefined) {
      payload.boxes = parsedInput.boxes;
    }
    if (parsedInput.points !== undefined) {
      payload.points = parsedInput.points;
    }

    const raw = await this.requestApi({
      path: "/jobs",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: parsedInput.signal,
      responseSchema: jobAcceptedRawSchema,
      operation: "createJob",
    });

    return buildJobAcceptedResult(raw);
  }

  async uploadAndCreateJob(
    input: UploadAndCreateJobRequest,
    onProgress?: (done: number, total: number) => void,
  ): Promise<JobAcceptedResult> {
    const parsedInput = parseInputOrThrow(
      uploadAndCreateJobRequestSchema,
      input,
      "uploadAndCreateJob",
    );

    const uploadedTaskIds: string[] = [];
    for (let i = 0; i < parsedInput.files.length; i++) {
      const file = parsedInput.files[i]!;
      const presigned = await this.createPresignedUpload({
        contentType: file.contentType,
        signal: parsedInput.signal,
      });
      await this.uploadImage({
        uploadUrl: presigned.uploadUrl,
        data: file.data,
        contentType: file.contentType,
        signal: parsedInput.signal,
      });
      uploadedTaskIds.push(presigned.taskId);
      onProgress?.(i + 1, parsedInput.files.length);
    }

    return this.createJob({
      type: parsedInput.type,
      prompts: parsedInput.prompts,
      boxes: parsedInput.boxes,
      points: parsedInput.points,
      threshold: parsedInput.threshold,
      maskThreshold: parsedInput.maskThreshold,
      items: uploadedTaskIds.map((taskId) => ({ taskId })),
      signal: parsedInput.signal,
    });
  }

  async getSegmentJob(input: GetSegmentJobRequest): Promise<JobStatusResult> {
    const parsedInput = parseInputOrThrow(getSegmentJobRequestSchema, input, "getSegmentJob");

    const raw = await this.requestApi({
      path: `/jobs/${encodeURIComponent(parsedInput.jobId)}`,
      method: "GET",
      signal: parsedInput.signal,
      responseSchema: jobStatusRawSchema,
      operation: "getSegmentJob",
    });

    return buildJobStatusResult(raw);
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
