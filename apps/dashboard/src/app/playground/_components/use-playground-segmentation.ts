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
  PlaygroundErrorState,
  PlaygroundResult,
  PlaygroundStatus,
  RunButtonState,
} from "./playground-types";

type QueuedRun = {
  apiKey: string;
  prompt: string;
};

type PlaygroundState = {
  apiKey: string;
  prompt: string;
  selectedFile: File | null;
  uploadedInputS3Key: string | null;
  uploadedApiKey: string | null;
  queuedRun: QueuedRun | null;
  status: PlaygroundStatus;
  result: PlaygroundResult | null;
  error: PlaygroundErrorState | null;
};

type PlaygroundAction =
  | { type: "apiKey:set"; value: string }
  | { type: "prompt:set"; value: string }
  | { type: "file:set"; file: File | null }
  | { type: "upload:start" }
  | { type: "upload:success"; apiKey: string; inputS3Key: string }
  | { type: "upload:error"; error: PlaygroundErrorState }
  | { type: "queue:set"; queuedRun: QueuedRun }
  | { type: "queue:clear" }
  | { type: "run:start" }
  | { type: "run:success"; result: PlaygroundResult }
  | { type: "run:error"; error: PlaygroundErrorState };

const initialPlaygroundState: PlaygroundState = {
  apiKey: "",
  error: null,
  prompt: "",
  queuedRun: null,
  result: null,
  selectedFile: null,
  status: "idle",
  uploadedApiKey: null,
  uploadedInputS3Key: null,
};

function playgroundReducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case "apiKey:set":
      return {
        ...state,
        apiKey: action.value,
      };
    case "prompt:set":
      return {
        ...state,
        prompt: action.value,
      };
    case "file:set":
      return {
        ...state,
        error: null,
        queuedRun: null,
        result: null,
        selectedFile: action.file,
        status: "idle",
        uploadedApiKey: null,
        uploadedInputS3Key: null,
      };
    case "upload:start":
      return {
        ...state,
        error: null,
        status: "uploading",
      };
    case "upload:success":
      return {
        ...state,
        status: "ready",
        uploadedApiKey: action.apiKey,
        uploadedInputS3Key: action.inputS3Key,
      };
    case "upload:error":
      return {
        ...state,
        error: action.error,
        queuedRun: null,
        status: "idle",
        uploadedApiKey: null,
        uploadedInputS3Key: null,
      };
    case "queue:set":
      return {
        ...state,
        queuedRun: action.queuedRun,
        status: "uploading",
      };
    case "queue:clear":
      return {
        ...state,
        queuedRun: null,
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
        status: state.uploadedInputS3Key ? "ready" : "idle",
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

export function usePlaygroundSegmentation() {
  const [state, dispatch] = useReducer(playgroundReducer, initialPlaygroundState);
  const uploadAttemptRef = useRef(0);
  const runAttemptRef = useRef(0);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
      runAttemptRef.current += 1;
    };
  }, []);

  const runSegmentation = useCallback(async (input: { apiKey: string; inputS3Key: string; prompt: string }) => {
    const runAttempt = ++runAttemptRef.current;
    dispatch({ type: "run:start" });

    try {
      const rawKey = input.apiKey.startsWith("Bearer ") ? input.apiKey.slice(7) : input.apiKey;
      const responseRes = await fetch("https://api.segmentationapi.com/v1/segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-key": rawKey,
        },
        body: JSON.stringify({
          inputS3Key: input.inputS3Key,
          prompts: input.prompt.split(",").map(p => p.trim()).filter(Boolean),
          threshold: 0.5,
          mask_threshold: 0.5,
        }),
      });

      if (!responseRes.ok) {
        const errData = await responseRes.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${responseRes.status}`);
      }

      const response = await responseRes.json() as PlaygroundResult;

      if (runAttemptRef.current !== runAttempt) {
        return;
      }

      dispatch({ type: "run:success", result: response });
      toast.success("Segmentation completed");
    } catch (error) {
      if (runAttemptRef.current !== runAttempt) {
        return;
      }

      console.error(error);
      const parsedError = parsePlaygroundError(error);
      dispatch({ type: "run:error", error: parsedError });
      toast.error(parsedError.title);
    }
  }, []);

  const uploadSelectedFile = useCallback(
    async (file: File, rawApiKey: string) => {
      const trimmedApiKey = rawApiKey.trim();
      const contentType = file.type || "image/png";

      if (!trimmedApiKey) {
        toast.error("Paste an API key before selecting an image");
        return;
      }

      if (file.type && !file.type.startsWith("image/")) {
        toast.error("Only image files are supported");
        return;
      }

      const uploadAttempt = ++uploadAttemptRef.current;
      uploadAbortRef.current?.abort();
      const abortController = new AbortController();
      uploadAbortRef.current = abortController;

      dispatch({ type: "upload:start" });

      try {
        const client = new SegmentationClient({
          apiKey: trimmedApiKey,
        });

        const presignedUpload = await client.createPresignedUpload({
          contentType,
          signal: abortController.signal,
        });

        await client.uploadImage({
          contentType,
          data: file,
          signal: abortController.signal,
          uploadUrl: presignedUpload.uploadUrl,
        });

        if (uploadAttemptRef.current !== uploadAttempt || abortController.signal.aborted) {
          return;
        }

        dispatch({
          type: "upload:success",
          apiKey: trimmedApiKey,
          inputS3Key: presignedUpload.inputS3Key,
        });
        toast.success("Image uploaded. Run segmentation when ready.");

        const queuedSegmentation = stateRef.current.queuedRun;
        if (!queuedSegmentation) {
          return;
        }

        dispatch({ type: "queue:clear" });

        if (queuedSegmentation.apiKey !== trimmedApiKey) {
          toast.error("Queued segmentation was skipped because API key changed.");
          return;
        }

        void runSegmentation({
          apiKey: queuedSegmentation.apiKey,
          inputS3Key: presignedUpload.inputS3Key,
          prompt: queuedSegmentation.prompt,
        });
      } catch (error) {
        if (uploadAttemptRef.current !== uploadAttempt || abortController.signal.aborted) {
          return;
        }

        console.error(error);
        const parsedError = parsePlaygroundError(error);
        dispatch({ type: "upload:error", error: parsedError });
        toast.error(parsedError.title);
      }
    },
    [runSegmentation],
  );

  const setApiKey = useCallback((value: string) => {
    dispatch({ type: "apiKey:set", value });
  }, []);

  const setPrompt = useCallback((value: string) => {
    dispatch({ type: "prompt:set", value });
  }, []);

  const onFileSelected = useCallback(
    (file: File | null) => {
      uploadAttemptRef.current += 1;
      runAttemptRef.current += 1;
      uploadAbortRef.current?.abort();

      dispatch({ type: "file:set", file });

      if (!file) {
        return;
      }

      void uploadSelectedFile(file, stateRef.current.apiKey);
    },
    [uploadSelectedFile],
  );

  const onRunRequested = useCallback(() => {
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

    if (!currentState.selectedFile) {
      toast.error("Upload an image to continue");
      return;
    }

    if (currentState.selectedFile.type && !currentState.selectedFile.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }

    const queuedRun: QueuedRun = {
      apiKey: trimmedApiKey,
      prompt: trimmedPrompt,
    };

    if (currentState.status === "uploading") {
      dispatch({ type: "queue:set", queuedRun });
      toast.success("Segmentation queued. It will run right after upload.");
      return;
    }

    if (!currentState.uploadedInputS3Key || currentState.uploadedApiKey !== trimmedApiKey) {
      dispatch({ type: "queue:set", queuedRun });
      void uploadSelectedFile(currentState.selectedFile, trimmedApiKey);
      toast.success("Segmentation queued. Uploading image first.");
      return;
    }

    dispatch({ type: "queue:clear" });
    void runSegmentation({
      apiKey: trimmedApiKey,
      inputS3Key: currentState.uploadedInputS3Key,
      prompt: trimmedPrompt,
    });
  }, [runSegmentation, uploadSelectedFile]);

  const isQueued = Boolean(state.queuedRun);
  const hasSelectedFile = Boolean(state.selectedFile);
  const statusMessage = hasSelectedFile
    ? isQueued
      ? "Segmentation queued. It will run after upload."
      : state.status === "uploading"
        ? "Uploading image..."
        : state.uploadedInputS3Key
          ? "Image uploaded. Ready to segment."
          : "Image not uploaded yet."
    : null;

  const runButtonState: RunButtonState =
    state.status === "running" ? "running" : isQueued ? "queued" : "default";

  return {
    apiKey: state.apiKey,
    error: state.error,
    onFileSelected,
    onRunRequested,
    prompt: state.prompt,
    result: state.result,
    runButtonState,
    selectedFile: state.selectedFile,
    setApiKey,
    setPrompt,
    statusMessage,
  };
}
