import type { ZodMiniType } from "zod/mini";
import { zipSync } from "fflate";
import { NetworkError, SegmentationApiError, UploadError } from "./errors";
import {
  buildVideoFramesArtifactKey,
  buildVideoFramesArtifactUrl,
  normalizeMaskArtifacts,
} from "./masks";
import {
  buildOutputManifestUrl,
  resolveManifestResultForTask,
  resolveOutputFolder,
} from "./output-manifest";
import { JobTaskStatus } from "./types";
import {
  jobAcceptedRawSchema,
  jobStatusRawSchema,
  apiErrorBodySchema,
  createJobRequestSchema,
  createPresignedUploadRequestSchema,
  downloadJobArtifactsRequestSchema,
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
  DownloadJobArtifactsRequest,
  DownloadJobArtifactsResult,
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

function buildJobStatusResult(raw: JobStatusRaw): JobStatusResult {
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

function zipEntriesToBlob(entries: Record<string, Uint8Array>): Blob {
  const zipped = zipSync(entries);
  return new Blob([new Uint8Array(zipped).buffer], { type: "application/zip" });
}

function ensureTaskIdsWithSuccess(status: JobStatusResult): string[] {
  const taskIds =
    status.items
      ?.filter((item) => item.status === JobTaskStatus.Success)
      .map((item) => item.taskId) ?? [];

  if (taskIds.length < 1) {
    throw new Error("No successful tasks are available for download.");
  }

  return taskIds;
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
    if (parsedInput.videoOutputMode !== undefined) {
      requestBody.videoOutputMode = parsedInput.videoOutputMode;
    }

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
    const parsedInput = parseInputOrThrow(createJobRequestSchema, input, "createJob");
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
    if (parsedInput.type === "video" && parsedInput.videoOutputMode !== undefined) {
      payload.videoOutputMode = parsedInput.videoOutputMode;
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

    if (parsedInput.type === "video") {
      return this.createJob({
        type: "video",
        prompts: parsedInput.prompts,
        videoOutputMode: parsedInput.videoOutputMode,
        threshold: parsedInput.threshold,
        maskThreshold: parsedInput.maskThreshold,
        items: uploadedTaskIds.map((taskId) => ({ taskId })),
        signal: parsedInput.signal,
      });
    }

    return this.createJob({
      type: "image_batch",
      prompts: parsedInput.prompts,
      boxes: parsedInput.boxes,
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

  async downloadJobArtifacts(
    input: DownloadJobArtifactsRequest,
  ): Promise<DownloadJobArtifactsResult> {
    const parsedInput = parseInputOrThrow(
      downloadJobArtifactsRequestSchema,
      input,
      "downloadJobArtifacts",
    );
    const status = await this.getSegmentJob({
      jobId: parsedInput.jobId,
      signal: parsedInput.signal,
    });

    const userId = parsedInput.accountId;

    const successfulTaskIds = ensureTaskIdsWithSuccess(status);

    if (status.type === "video") {
      const taskContent = await Promise.all(
        successfulTaskIds.map(async (taskId) => {
          const key = buildVideoFramesArtifactKey({
            userId,
            jobId: status.jobId,
            taskId,
          });
          const url = buildVideoFramesArtifactUrl(key);
          const binary = await this.fetchAssetBinary(url, parsedInput.signal);
          return { taskId, binary };
        }),
      );

      if (taskContent.length === 1) {
        return {
          jobId: status.jobId,
          type: "video",
          kind: "video_frames_ndjson",
          fileName: "frames.ndjson",
          mimeType: "application/x-ndjson",
          blob: new Blob([new Uint8Array(taskContent[0]!.binary).buffer], {
            type: "application/x-ndjson",
          }),
          taskCount: 1,
          fileCount: 1,
        };
      }

      const zipEntries: Record<string, Uint8Array> = {};
      for (const entry of taskContent) {
        zipEntries[`${entry.taskId}/frames.ndjson`] = entry.binary;
      }

      return {
        jobId: status.jobId,
        type: "video",
        kind: "video_frames_zip",
        fileName: `${status.jobId}-frames.zip`,
        mimeType: "application/zip",
        blob: zipEntriesToBlob(zipEntries),
        taskCount: successfulTaskIds.length,
        fileCount: taskContent.length,
      };
    }

    const manifestUrl = buildOutputManifestUrl(userId, status.jobId, resolveOutputFolder(status));
    const manifest = await this.fetchAssetJson(manifestUrl, parsedInput.signal);
    const maskArtifactsByTask = successfulTaskIds.flatMap((taskId) =>
      normalizeMaskArtifacts(resolveManifestResultForTask(manifest, taskId), {
        userId,
        jobId: status.jobId,
        taskId,
      }).map((artifact) => ({ taskId, artifact })),
    );

    if (maskArtifactsByTask.length < 1) {
      throw new Error("No mask artifacts were found for successful tasks.");
    }

    const zipEntries: Record<string, Uint8Array> = {};
    await Promise.all(
      maskArtifactsByTask.map(async ({ taskId, artifact }) => {
        const binary = await this.fetchAssetBinary(artifact.url, parsedInput.signal);
        const maskSuffix = Number.isInteger(artifact.maskIndex)
          ? artifact.maskIndex
          : Math.floor(artifact.maskIndex);
        const fileKey = `${taskId}/mask_${maskSuffix}.png`;
        zipEntries[fileKey] = binary;
      }),
    );

    return {
      jobId: status.jobId,
      type: "image_batch",
      kind: "image_masks_zip",
      fileName: `${status.jobId}-masks.zip`,
      mimeType: "application/zip",
      blob: zipEntriesToBlob(zipEntries),
      taskCount: successfulTaskIds.length,
      fileCount: Object.keys(zipEntries).length,
    };
  }

  private async fetchAssetResponse(url: string, signal?: AbortSignal): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        signal,
      });
    } catch (error) {
      throw new NetworkError("Artifact download failed due to a network error.", {
        context: "api",
        cause: error,
      });
    }

    if (!response.ok) {
      throw new Error(`Artifact download failed for ${url} with status ${response.status}.`);
    }

    return response;
  }

  private async fetchAssetJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await this.fetchAssetResponse(url, signal);

    try {
      return await response.json();
    } catch {
      throw new Error(`Artifact response is not valid JSON: ${url}.`);
    }
  }

  private async fetchAssetBinary(url: string, signal?: AbortSignal): Promise<Uint8Array> {
    const response = await this.fetchAssetResponse(url, signal);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
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
