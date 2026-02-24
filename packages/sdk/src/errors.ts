import type { ResponseBody } from "./types";

export type ValidationDirection = "input" | "response";

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export class SegmentationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "SegmentationError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
}

export class ValidationError extends SegmentationError {
  readonly operation: string;
  readonly direction: ValidationDirection;
  readonly issues: ValidationIssue[];

  constructor(
    message: string,
    options: {
      operation: string;
      direction: ValidationDirection;
      issues: ValidationIssue[];
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ValidationError";
    this.operation = options.operation;
    this.direction = options.direction;
    this.issues = options.issues;
  }
}

export class NetworkError extends SegmentationError {
  readonly context: "api" | "upload";

  constructor(
    message: string,
    options: { context: "api" | "upload"; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "NetworkError";
    this.context = options.context;
  }
}

export class SegmentationApiError extends SegmentationError {
  readonly status: number;
  readonly body: ResponseBody;
  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      status: number;
      body: ResponseBody;
      requestId?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "SegmentationApiError";
    this.status = options.status;
    this.body = options.body;
    if (options.requestId !== undefined) {
      this.requestId = options.requestId;
    }
  }
}

export class UploadError extends SegmentationError {
  readonly status: number;
  readonly url: string;
  readonly body: ResponseBody;

  constructor(
    message: string,
    options: {
      status: number;
      url: string;
      body: ResponseBody;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "UploadError";
    this.status = options.status;
    this.url = options.url;
    this.body = options.body;
  }
}
