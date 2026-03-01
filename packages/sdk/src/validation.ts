import * as z from "zod/mini";
import { ValidationError, type ValidationIssue } from "./errors";
import type {
  CreateJobRequest,
  CreatePresignedUploadRequest,
  FetchFunction,
  GetSegmentJobRequest,
  JobAcceptedRaw,
  JobStatusItemRaw,
  JobStatusRaw,
  PresignedUploadRaw,
  SegmentVideoRequest,
  UploadAndCreateJobRequest,
  UploadImageRequest,
} from "./types";

export const nonEmptyString = z
  .string()
  .check(
    z.refine(
      (value) => value.trim().length > 0,
      "Expected a non-empty string.",
    ),
  );

export const finiteNumber = z
  .number()
  .check(z.refine(Number.isFinite, "Expected a finite number."));
export const finiteInteger = finiteNumber.check(
  z.refine(Number.isInteger, "Expected an integer."),
);

export const urlString = z.url();

const blobSchema =
  typeof Blob === "undefined"
    ? z.never("Blob is not available in this runtime.")
    : z.instanceof(Blob);

const abortSignalSchema =
  typeof AbortSignal === "undefined"
    ? z.optional(z.undefined())
    : z.optional(z.instanceof(AbortSignal));

const fetchFunctionSchema = z.custom<FetchFunction, unknown>(
  (value) => typeof value === "function",
  "Expected `fetch` to be a function.",
);

export const binaryDataSchema = z.union([blobSchema, z.instanceof(Uint8Array)]);

export const segmentationClientOptionsSchema = z
  .object({
    apiKey: z.optional(nonEmptyString),
    jwt: z.optional(nonEmptyString),
    fetch: z.optional(fetchFunctionSchema),
  })
  .check(
    z.refine(
      (value) => value.apiKey !== undefined || value.jwt !== undefined,
      "Provide either `apiKey` or `jwt`.",
    ),
    z.refine(
      (value) => !(value.apiKey !== undefined && value.jwt !== undefined),
      "Provide only one credential: `apiKey` or `jwt`, not both.",
    ),
  );

export const createPresignedUploadRequestSchema: z.ZodMiniType<CreatePresignedUploadRequest> =
  z.object({
    contentType: nonEmptyString,
    signal: abortSignalSchema,
  });

export const uploadImageRequestSchema: z.ZodMiniType<UploadImageRequest> =
  z.object({
    uploadUrl: urlString,
    data: binaryDataSchema,
    contentType: z.optional(nonEmptyString),
    signal: abortSignalSchema,
  });

export const promptsSchema = z
  .array(nonEmptyString);

export const imageBoxSchema = z.object({
  coordinates: z.tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber]),
  isPositive: z.boolean(),
  objectId: z.optional(nonEmptyString),
});

export const imageBoxesSchema = z.array(imageBoxSchema);

const pointSchema = z.object({
  coordinates: z.tuple([finiteNumber, finiteNumber]),
  isPositive: z.boolean(),
  objectId: z.optional(z.string()),
});

const boxInputSchema = z.object({
  coordinates: z.array(finiteNumber).check(
    z.refine((value) => value.length >= 4, "Each box must have at least 4 coordinates."),
  ),
  isPositive: z.optional(z.boolean()),
  objectId: z.optional(z.string()),
});

const batchSegmentItemInputSchema = z.object({
  taskId: nonEmptyString,
});

export const createJobRequestSchema: z.ZodMiniType<CreateJobRequest> =
  z.object({
    type: z.enum(["image_batch", "video"]),
    prompts: z.optional(promptsSchema),
    boxes: z.optional(imageBoxesSchema),
    points: z.optional(z.array(pointSchema)),
    threshold: z.optional(finiteNumber),
    maskThreshold: z.optional(finiteNumber),
    items: z.array(batchSegmentItemInputSchema).check(
      z.refine((value) => value.length >= 1, "Expected at least 1 item."),
      z.refine((value) => value.length <= 100, "Expected at most 100 items."),
    ),
    signal: abortSignalSchema,
  });

const uploadFileSchema = z.object({
  data: binaryDataSchema,
  contentType: nonEmptyString,
});

export const uploadAndCreateJobRequestSchema: z.ZodMiniType<UploadAndCreateJobRequest> =
  z.object({
    type: z.enum(["image_batch", "video"]),
    prompts: z.optional(promptsSchema),
    boxes: z.optional(imageBoxesSchema),
    points: z.optional(z.array(pointSchema)),
    files: z.array(uploadFileSchema).check(
      z.refine((value) => value.length >= 1, "Expected at least 1 file."),
    ),
    threshold: z.optional(finiteNumber),
    maskThreshold: z.optional(finiteNumber),
    signal: abortSignalSchema,
  });

// --- Video request schemas ---

const segmentVideoPointSchema = z.object({
  coordinates: z.tuple([finiteNumber, finiteNumber]),
  isPositive: z.boolean(),
  objectId: z.optional(z.union([finiteNumber, nonEmptyString])),
});

const segmentVideoBoxSchema = z.object({
  coordinates: z.tuple([
    finiteNumber,
    finiteNumber,
    finiteNumber,
    finiteNumber,
  ]),
  isPositive: z.boolean(),
  objectId: z.optional(z.union([finiteNumber, nonEmptyString])),
});

const segmentVideoPointsPromptSchema = z
  .object({
    points: z
      .array(segmentVideoPointSchema)
      .check(
        z.refine((value) => value.length >= 1, "Expected at least 1 point prompt."),
      ),
    boxes: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    pointLabels: z.optional(
      z.never("Use inline point objects with `isPositive` and optional `objectId`."),
    ),
    pointObjectIds: z.optional(
      z.never("Use inline point objects with `isPositive` and optional `objectId`."),
    ),
    boxObjectIds: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
  });

const segmentVideoBoxesPromptSchema = z
  .object({
    boxes: z
      .array(segmentVideoBoxSchema)
      .check(
        z.refine((value) => value.length >= 1, "Expected at least 1 box prompt."),
      ),
    boxObjectIds: z.optional(
      z.never("Use inline box objects with `isPositive` and optional `objectId`."),
    ),
    points: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    pointLabels: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    pointObjectIds: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
  });

const segmentVideoSamplingByFpsSchema = z.object({
  fps: finiteNumber.check(
    z.refine((value) => value > 0, "`fps` must be greater than 0."),
  ),
  numFrames: z.optional(
    z.never("Provide only one sampling selector: `fps` or `numFrames`."),
  ),
});

const segmentVideoSamplingByFrameCountSchema = z.object({
  fps: z.optional(
    z.never("Provide only one sampling selector: `fps` or `numFrames`."),
  ),
  numFrames: finiteInteger.check(
    z.refine((value) => value >= 1, "`numFrames` must be >= 1."),
  ),
});

const segmentVideoSamplingDefaultSchema = z.object({
  fps: z.optional(
    z.never("Provide only one sampling selector: `fps` or `numFrames`."),
  ),
  numFrames: z.optional(
    z.never("Provide only one sampling selector: `fps` or `numFrames`."),
  ),
});

const segmentVideoBaseSchema = z.object({
  file: binaryDataSchema,
  maxFrames: z.optional(finiteInteger),
  frameIdx: z.optional(finiteInteger),
  text: z.optional(z.never("Field `text` is not supported for video segmentation.")),
  signal: abortSignalSchema,
});

export const segmentVideoRequestSchema: z.ZodMiniType<SegmentVideoRequest> = z
  .intersection(
    segmentVideoBaseSchema,
    z.intersection(
      z.union([segmentVideoPointsPromptSchema, segmentVideoBoxesPromptSchema]),
      z.union([
        segmentVideoSamplingByFpsSchema,
        segmentVideoSamplingByFrameCountSchema,
        segmentVideoSamplingDefaultSchema,
      ]),
    ),
  )
  .check(
    z.refine(
      (value) => value.maxFrames === undefined || value.maxFrames >= 1,
      "`maxFrames` must be >= 1.",
    ),
    z.refine(
      (value) => value.frameIdx === undefined || value.frameIdx >= 0,
      "`frameIdx` must be >= 0.",
    ),
  );

export const getSegmentJobRequestSchema: z.ZodMiniType<GetSegmentJobRequest> =
  z.object({
    jobId: nonEmptyString,
    signal: abortSignalSchema,
  });

// --- Response schemas ---

export const responseBodyRecordSchema = z.record(z.string(), z.unknown());

export const apiErrorBodySchema = z.object({
  requestId: z.optional(z.string()),
});

export const presignedUploadRawSchema: z.ZodMiniType<PresignedUploadRaw> =
  z.object({
    uploadUrl: urlString,
    taskId: nonEmptyString,
    bucket: nonEmptyString,
    expiresIn: finiteNumber,
  });

export const jobAcceptedRawSchema: z.ZodMiniType<JobAcceptedRaw> =
  z.object({
    requestId: z.optional(z.string()),
    jobId: nonEmptyString,
    type: z.enum(["image_batch", "video"]),
    status: z.literal("queued"),
    totalItems: finiteNumber,
  });

export const jobStatusItemRawSchema: z.ZodMiniType<JobStatusItemRaw> = z.object({
  taskId: nonEmptyString,
  status: z.enum(["queued", "running", "success", "failed"]),
  error: z.optional(z.nullable(nonEmptyString)),
});

export const jobStatusRawSchema: z.ZodMiniType<JobStatusRaw> =
  z.object({
    requestId: z.optional(z.string()),
    jobId: nonEmptyString,
    type: z.enum(["image_batch", "video"]),
    status: z.enum([
      "queued",
      "processing",
      "completed",
      "completed_with_errors",
      "failed",
    ]),
    totalItems: finiteNumber,
    queuedItems: finiteNumber,
    processingItems: finiteNumber,
    successItems: finiteNumber,
    failedItems: finiteNumber,
    items: z.optional(z.array(jobStatusItemRawSchema)),
    error: z.optional(nonEmptyString),
  });

// --- Parse helpers ---

function normalizeIssues(
  issues: readonly z.core.$ZodIssue[],
): ValidationIssue[] {
  return issues.map((issue) => ({
    path:
      issue.path.length === 0
        ? "<root>"
        : issue.path.map((segment) => String(segment)).join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function parseInputOrThrow<TSchema extends z.ZodMiniType>(
  schema: TSchema,
  value: unknown,
  operation: string,
): z.output<TSchema> {
  const parsed = z.safeParse(schema, value);
  if (parsed.success) {
    return parsed.data;
  }

  throw new ValidationError(`Invalid input for ${operation}.`, {
    operation,
    direction: "input",
    issues: normalizeIssues(parsed.error.issues),
  });
}

export function parseResponseOrThrow<TSchema extends z.ZodMiniType>(
  schema: TSchema,
  value: unknown,
  operation: string,
): z.output<TSchema> {
  const parsed = z.safeParse(schema, value);
  if (parsed.success) {
    return parsed.data;
  }

  throw new ValidationError(`Invalid response for ${operation}.`, {
    operation,
    direction: "response",
    issues: normalizeIssues(parsed.error.issues),
  });
}
