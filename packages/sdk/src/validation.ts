import * as z from "zod/mini";
import { ValidationError, type ValidationIssue } from "./errors";
import {
  JobRequestStatus,
  JobTaskStatus,
  type CreateJobRequest,
  type CreatePresignedUploadRequest,
  type FetchFunction,
  type GetSegmentJobRequest,
  type JobAcceptedRaw,
  type JobStatusItemRaw,
  type JobStatusRaw,
  type PresignedUploadRaw,
  type SegmentVideoRequest,
  type UploadAndCreateJobRequest,
  type UploadImageRequest,
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

const batchSegmentItemInputSchema = z.object({
  taskId: nonEmptyString,
});

const createJobRequestCommonSchema = z.object({
  threshold: z.optional(finiteNumber),
  maskThreshold: z.optional(finiteNumber),
  items: z.array(batchSegmentItemInputSchema).check(
    z.refine((value) => value.length >= 1, "Expected at least 1 item."),
    z.refine((value) => value.length <= 100, "Expected at most 100 items."),
  ),
  signal: abortSignalSchema,
});

const createImageBatchJobRequestSchema = z.object({
  type: z.literal("image_batch"),
  prompts: z.optional(promptsSchema),
  boxes: z.optional(imageBoxesSchema),
});

const createVideoJobRequestSchema = z.object({
  type: z.literal("video"),
  prompts: promptsSchema.check(
    z.refine((value) => value.length >= 1, "Expected at least 1 prompt."),
  ),
  boxes: z.optional(z.never("Field `boxes` is not supported for video jobs.")),
  points: z.optional(z.never("Field `points` is not supported.")),
});

export const createJobRequestSchema: z.ZodMiniType<CreateJobRequest> = z.intersection(
  createJobRequestCommonSchema,
  z.union([createImageBatchJobRequestSchema, createVideoJobRequestSchema]),
);

const uploadFileSchema = z.object({
  data: binaryDataSchema,
  contentType: nonEmptyString,
});

const uploadAndCreateJobRequestCommonSchema = z.object({
  files: z.array(uploadFileSchema).check(
    z.refine((value) => value.length >= 1, "Expected at least 1 file."),
  ),
  threshold: z.optional(finiteNumber),
  maskThreshold: z.optional(finiteNumber),
  signal: abortSignalSchema,
});

const uploadAndCreateImageBatchJobRequestSchema = z.object({
  type: z.literal("image_batch"),
  prompts: z.optional(promptsSchema),
  boxes: z.optional(imageBoxesSchema),
});

const uploadAndCreateVideoJobRequestSchema = z.object({
  type: z.literal("video"),
  prompts: promptsSchema.check(
    z.refine((value) => value.length >= 1, "Expected at least 1 prompt."),
  ),
  boxes: z.optional(z.never("Field `boxes` is not supported for video jobs.")),
  points: z.optional(z.never("Field `points` is not supported.")),
});

export const uploadAndCreateJobRequestSchema: z.ZodMiniType<UploadAndCreateJobRequest> = z.intersection(
  uploadAndCreateJobRequestCommonSchema,
  z.union([uploadAndCreateImageBatchJobRequestSchema, uploadAndCreateVideoJobRequestSchema]),
);

// --- Video request schemas ---

const segmentVideoPromptsSchema = z.object({
  prompts: promptsSchema.check(
    z.refine((value) => value.length >= 1, "Expected at least 1 prompt."),
  ),
  points: z.optional(z.never("Field `points` is not supported for video segmentation.")),
  boxes: z.optional(z.never("Field `boxes` is not supported for video segmentation.")),
  text: z.optional(z.never("Field `text` is not supported for video segmentation.")),
  pointLabels: z.optional(z.never("Field `pointLabels` is not supported for video segmentation.")),
  pointObjectIds: z.optional(z.never("Field `pointObjectIds` is not supported for video segmentation.")),
  boxObjectIds: z.optional(z.never("Field `boxObjectIds` is not supported for video segmentation.")),
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
  signal: abortSignalSchema,
});

export const segmentVideoRequestSchema: z.ZodMiniType<SegmentVideoRequest> = z
  .intersection(
    segmentVideoBaseSchema,
    z.intersection(
      segmentVideoPromptsSchema,
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
  status: z.enum(JobTaskStatus),
  error: z.optional(z.nullable(nonEmptyString)),
});

export const jobStatusRawSchema: z.ZodMiniType<JobStatusRaw> =
  z.object({
    requestId: z.optional(z.string()),
    jobId: nonEmptyString,
    type: z.enum(["image_batch", "video"]),
    status: z.enum(JobRequestStatus),
    totalItems: finiteNumber,
    queuedItems: finiteNumber,
    processingItems: finiteNumber,
    successItems: finiteNumber,
    failedItems: finiteNumber,
    accountId: z.optional(nonEmptyString),
    outputFolder: z.optional(nonEmptyString),
    inputs: z.optional(z.array(nonEmptyString)),
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
