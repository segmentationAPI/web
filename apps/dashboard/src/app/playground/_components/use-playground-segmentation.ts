"use client";

import {
  NetworkError,
  SegmentationApiError,
  SegmentationClient,
  UploadError,
} from "@segmentationapi/sdk";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";

import type {
  BatchSegmentStatusResult,
  PlaygroundErrorState,
  PlaygroundResult,
  PlaygroundStatus,
  RunButtonState,
} from "./playground-types";

type PlaygroundState = {
  apiKey: string;
  batchMode: boolean;
  prompt: string;
  selectedFiles: File[];
  status: PlaygroundStatus;
  result: PlaygroundResult | null;
  error: PlaygroundErrorState | null;
};

type PlaygroundAction =
  | { type: "apiKey:set"; value: string }
  | { type: "batchMode:set"; value: boolean }
  | { type: "prompt:set"; value: string }
  | { type: "files:set"; files: File[] }
  | { type: "run:start" }
  | { type: "run:success"; result: PlaygroundResult }
  | { type: "run:error"; error: PlaygroundErrorState };

const initialPlaygroundState: PlaygroundState = {
  apiKey: "",
  batchMode: false,
  error: null,
  prompt: "",
  result: null,
  selectedFiles: [],
  status: "idle",
};

function playgroundReducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case "apiKey:set":
      return {
        ...state,
        apiKey: action.value,
      };
    case "batchMode:set":
      return {
        ...state,
        batchMode: action.value,
        error: null,
        result: null,
        selectedFiles: action.value ? state.selectedFiles : state.selectedFiles.slice(0, 1),
        status: "idle",
      };
    case "prompt:set":
      return {
        ...state,
        prompt: action.value,
      };
    case "files:set":
      return {
        ...state,
        error: null,
        result: null,
        selectedFiles: action.files,
        status: "idle",
      };
    case "run:start":
      return {
        ...state,
        error: null,
        status: "running",
      };
    case "run:success":
      return {
        ...state,
        result: action.result,
        status: "ready",
      };
    case "run:error":
      return {
        ...state,
        error: action.error,
        status: "idle",
      };
  }
}

function stringifyErrorBody(body: unknown) {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    return body;
  }

  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

function parsePlaygroundError(error: unknown): PlaygroundErrorState {
  if (error instanceof SegmentationApiError) {
    const details = [
      `Status: ${error.status}`,
      error.requestId ? `Request ID: ${error.requestId}` : null,
      stringifyErrorBody(error.body),
    ].filter(Boolean) as string[];

    return {
      details,
      title: "Segmentation API request failed",
    };
  }

  if (error instanceof UploadError) {
    const details = [
      `Status: ${error.status}`,
      `Upload URL: ${error.url}`,
      stringifyErrorBody(error.body),
    ].filter(Boolean) as string[];

    return {
      details,
      title: "Image upload failed",
    };
  }

  if (error instanceof NetworkError) {
    const details = [
      typeof error.context === "string" ? error.context : JSON.stringify(error.context),
      error.cause instanceof Error ? error.cause.message : String(error.cause ?? ""),
    ].filter(Boolean) as string[];

    return {
      details,
      title: "Network error",
    };
  }

  if (error instanceof Error) {
    return {
      details: [error.message],
      title: "Unexpected error",
    };
  }

  return {
    details: ["Unknown failure while processing the playground request."],
    title: "Unexpected error",
  };
}

const TERMINAL_BATCH_STATUSES = new Set(["completed", "completed_with_errors", "failed"]);
const API_BASE_URL = "https://api.segmentationapi.com/v1";

async function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function readResponseBody(response: Response): Promise<Record<string, unknown> | string | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : text;
  } catch {
    return text;
  }
}

function extractRequestId(body: Record<string, unknown> | string | null): string | undefined {
  if (!body || typeof body === "string") {
    return undefined;
  }

  const requestId = body.requestId;
  if (typeof requestId === "string") {
    return requestId;
  }

  const requestIdSnake = body.request_id;
  return typeof requestIdSnake === "string" ? requestIdSnake : undefined;
}

async function requestBatchApi<T>(input: {
  apiKey: string;
  path: string;
  method: "POST" | "GET";
  body?: Record<string, unknown>;
  signal: AbortSignal;
}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${input.path}`, {
      method: input.method,
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
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
      requestId: extractRequestId(parsedBody),
    });
  }

  return parsedBody as T;
}

type BatchAcceptedResponse = {
  job_id: string;
};

type BatchStatusResponse = {
  requestId?: string;
  request_id?: string;
  job_id: string;
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed";
  total_items: number;
  queued_items: number;
  processing_items: number;
  success_items: number;
  failed_items: number;
  items: Array<{
    index: number;
    inputS3Key: string;
    status: "queued" | "processing" | "success" | "failed";
    masks?: Array<{
      key: string;
      url?: string;
      score?: number | null;
      box?: number[] | null;
    }>;
    error?: string;
    error_code?: string;
  }>;
};

function normalizeBatchStatus(raw: BatchStatusResponse): BatchSegmentStatusResult {
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
      index: item.index,
      inputS3Key: item.inputS3Key,
      status: item.status,
      masks: item.masks?.map((mask) => ({
        key: mask.key,
        url: typeof mask.url === "string" ? mask.url : `https://assets.segmentationapi.com/${mask.key}`,
        score: mask.score ?? undefined,
        box: mask.box ?? undefined,
      })),
      error: item.error,
      errorCode: item.error_code,
    })),
  };
}

export function usePlaygroundSegmentation() {
  const [state, dispatch] = useReducer(playgroundReducer, initialPlaygroundState);
  const runAbortRef = useRef<AbortController | null>(null);
  const runAttemptRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      runAttemptRef.current += 1;
      runAbortRef.current?.abort();
    };
  }, []);

  const setApiKey = useCallback((value: string) => {
    dispatch({ type: "apiKey:set", value });
  }, []);

  const setBatchMode = useCallback((value: boolean) => {
    runAttemptRef.current += 1;
    runAbortRef.current?.abort();
    dispatch({ type: "batchMode:set", value });
  }, []);

  const setPrompt = useCallback((value: string) => {
    dispatch({ type: "prompt:set", value });
  }, []);

  const onFilesSelected = useCallback((files: File[]) => {
    runAttemptRef.current += 1;
    runAbortRef.current?.abort();
    dispatch({ type: "files:set", files });
  }, []);

  const onRunRequested = useCallback(async () => {
    const currentState = stateRef.current;
    const trimmedApiKey = currentState.apiKey.trim();
    const trimmedPrompt = currentState.prompt.trim();

    if (currentState.status === "running") {
      return;
    }

    if (!trimmedApiKey) {
      toast.error("Paste an API key to continue");
      return;
    }

    if (!trimmedPrompt) {
      toast.error("Prompt is required");
      return;
    }

    if (currentState.selectedFiles.length === 0) {
      toast.error(currentState.batchMode ? "Upload images to continue" : "Upload an image to continue");
      return;
    }

    for (const file of currentState.selectedFiles) {
      if (file.type && !file.type.startsWith("image/")) {
        toast.error("Only image files are supported");
        return;
      }
    }

    const runAttempt = ++runAttemptRef.current;
    runAbortRef.current?.abort();
    const abortController = new AbortController();
    runAbortRef.current = abortController;
    dispatch({ type: "run:start" });

    try {
      const client = new SegmentationClient({
        apiKey: trimmedApiKey,
      });

      if (!currentState.batchMode) {
        const file = currentState.selectedFiles[0];
        if (!file) {
          toast.error("Upload an image to continue");
          return;
        }

        const contentType = file.type || "image/png";
        const response = await client.uploadAndSegment({
          prompt: trimmedPrompt,
          data: file,
          contentType,
          threshold: 0.5,
          maskThreshold: 0.5,
          signal: abortController.signal,
        });

        if (runAttemptRef.current !== runAttempt || abortController.signal.aborted) {
          return;
        }

        dispatch({
          type: "run:success",
          result: {
            mode: "single",
            raw: response,
            previewFileIndex: 0,
            previewMasks: response.masks.map((mask) => ({ url: mask.url })),
            summary: `Completed with ${response.masks.length} mask${response.masks.length === 1 ? "" : "s"}.`,
          },
        });
        toast.success("Segmentation completed");
        return;
      }

      const uploadedInputS3Keys = await Promise.all(
        currentState.selectedFiles.map(async (file) => {
          const contentType = file.type || "image/png";
          const presignedUpload = await client.createPresignedUpload({
            contentType,
            signal: abortController.signal,
          });
          await client.uploadImage({
            uploadUrl: presignedUpload.uploadUrl,
            data: file,
            contentType,
            signal: abortController.signal,
          });
          return presignedUpload.inputS3Key;
        }),
      );

      const accepted = await requestBatchApi<BatchAcceptedResponse>({
        apiKey: trimmedApiKey,
        path: "/segment/batch",
        method: "POST",
        body: {
          prompt: trimmedPrompt,
          threshold: 0.5,
          mask_threshold: 0.5,
          items: uploadedInputS3Keys.map((inputS3Key) => ({ inputS3Key })),
        },
        signal: abortController.signal,
      });

      toast.success(`Batch accepted (${uploadedInputS3Keys.length} images). Processing...`);

      let finalBatchStatus = normalizeBatchStatus(
        await requestBatchApi<BatchStatusResponse>({
          apiKey: trimmedApiKey,
          path: `/segment/batch/${encodeURIComponent(accepted.job_id)}`,
          method: "GET",
          signal: abortController.signal,
        }),
      );

      let pollsRemaining = 60;
      while (!TERMINAL_BATCH_STATUSES.has(finalBatchStatus.status) && pollsRemaining > 0) {
        await waitFor(2000, abortController.signal);
        finalBatchStatus = normalizeBatchStatus(
          await requestBatchApi<BatchStatusResponse>({
            apiKey: trimmedApiKey,
            path: `/segment/batch/${encodeURIComponent(accepted.job_id)}`,
            method: "GET",
            signal: abortController.signal,
          }),
        );
        pollsRemaining -= 1;
      }

      if (runAttemptRef.current !== runAttempt || abortController.signal.aborted) {
        return;
      }

      const previewItem = finalBatchStatus.items.find(
        (item) => item.status === "success" && item.masks && item.masks.length > 0,
      );
      const previewFileIndex = previewItem ? previewItem.index : null;
      const summary = `Batch ${finalBatchStatus.status}: ${finalBatchStatus.successItems} success, ${finalBatchStatus.failedItems} failed.`;

      dispatch({
        type: "run:success",
        result: {
          mode: "batch",
          raw: finalBatchStatus,
          previewFileIndex,
          previewMasks: (previewItem?.masks ?? []).map((mask) => ({ url: mask.url })),
          summary,
        },
      });
      toast.success(summary);
    } catch (error) {
      if (runAttemptRef.current !== runAttempt || abortController.signal.aborted) {
        return;
      }

      console.error(error);
      const parsedError = parsePlaygroundError(error);
      dispatch({ type: "run:error", error: parsedError });
      toast.error(parsedError.title);
    }
  }, []);

  const runButtonState: RunButtonState = state.status === "running" ? "running" : "default";

  const statusMessage =
    state.status === "running"
      ? state.batchMode
        ? `Running batch segmentation for ${state.selectedFiles.length} image${state.selectedFiles.length === 1 ? "" : "s"}...`
        : "Running segmentation..."
      : state.result
        ? state.result.summary
        : state.selectedFiles.length > 0
          ? state.batchMode
            ? `${state.selectedFiles.length} image${state.selectedFiles.length === 1 ? "" : "s"} selected.`
            : `${state.selectedFiles[0]?.name ?? "Image"} selected.`
          : null;

  return {
    apiKey: state.apiKey,
    batchMode: state.batchMode,
    error: state.error,
    onFilesSelected,
    onRunRequested,
    prompt: state.prompt,
    result: state.result,
    runButtonState,
    selectedFiles: state.selectedFiles,
    setApiKey,
    setBatchMode,
    setPrompt,
    statusMessage,
  };
}
