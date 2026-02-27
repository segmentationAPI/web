import * as z from "zod/mini";
import { ValidationError, type ValidationIssue } from "./errors";
import type {
  BatchSegmentAcceptedRaw,
  BatchSegmentMaskRaw,
  BatchSegmentStatusRaw,
  CreateBatchSegmentJobRequest,
  CreatePresignedUploadRequest,
  FetchFunction,
  GetSegmentJobRequest,
  PresignedUploadRaw,
  SegmentJobAcceptedRaw,
  SegmentJobStatusRaw,
  SegmentMaskRaw,
  SegmentResponseRaw,
  SegmentRequest,
  SegmentVideoRequest,
  UploadAndSegmentRequest,
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
  .array(nonEmptyString)
  .check(z.refine((value) => value.length >= 1, "Expected at least 1 prompt."));

export const segmentRequestSchema: z.ZodMiniType<SegmentRequest> = z.object({
  prompts: promptsSchema,
  inputS3Key: nonEmptyString,
  threshold: z.optional(finiteNumber),
  maskThreshold: z.optional(finiteNumber),
  signal: abortSignalSchema,
});

const segmentVideoPointSchema = z.tuple([finiteNumber, finiteNumber]);

const segmentVideoBoxSchema = z.tuple([
  finiteNumber,
  finiteNumber,
  finiteNumber,
  finiteNumber,
]);

const segmentVideoObjectIdSchema = z.union([finiteNumber, nonEmptyString]);

const segmentVideoPointsPromptSchema = z
  .object({
    points: z
      .array(segmentVideoPointSchema)
      .check(
        z.refine((value) => value.length >= 1, "Expected at least 1 point prompt."),
      ),
    pointLabels: z.optional(z.array(finiteNumber)),
    pointObjectIds: z.optional(z.array(segmentVideoObjectIdSchema)),
    boxes: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    boxObjectIds: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
  })
  .check(
    z.refine(
      (value) =>
        value.pointLabels === undefined ||
        value.pointLabels.length === value.points.length,
      "`pointLabels` length must match `points` length.",
    ),
    z.refine(
      (value) =>
        value.pointObjectIds === undefined ||
        value.pointObjectIds.length === value.points.length,
      "`pointObjectIds` length must match `points` length.",
    ),
  );

const segmentVideoBoxesPromptSchema = z
  .object({
    boxes: z
      .array(segmentVideoBoxSchema)
      .check(
        z.refine((value) => value.length >= 1, "Expected at least 1 box prompt."),
      ),
    boxObjectIds: z.optional(z.array(segmentVideoObjectIdSchema)),
    points: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    pointLabels: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
    pointObjectIds: z.optional(
      z.never("Provide exactly one visual prompt mode: `points` or `boxes`."),
    ),
  })
  .check(
    z.refine(
      (value) =>
        value.boxObjectIds === undefined ||
        value.boxObjectIds.length === value.boxes.length,
      "`boxObjectIds` length must match `boxes` length.",
    ),
  );

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
  clearOldInputs: z.optional(z.boolean()),
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

export const uploadAndSegmentRequestSchema: z.ZodMiniType<UploadAndSegmentRequest> =
  z.object({
    prompts: promptsSchema,
    data: binaryDataSchema,
    contentType: nonEmptyString,
    threshold: z.optional(finiteNumber),
    maskThreshold: z.optional(finiteNumber),
    signal: abortSignalSchema,
  });

export const batchSegmentItemInputSchema = z.object({
  inputS3Key: nonEmptyString,
});

export const createBatchSegmentJobRequestSchema: z.ZodMiniType<CreateBatchSegmentJobRequest> =
  z.object({
    prompts: promptsSchema,
    threshold: z.optional(finiteNumber),
    maskThreshold: z.optional(finiteNumber),
    items: z.array(batchSegmentItemInputSchema).check(
      z.refine((value) => value.length >= 1, "Expected at least 1 item."),
      z.refine((value) => value.length <= 100, "Expected at most 100 items."),
    ),
    signal: abortSignalSchema,
  });

export const getSegmentJobRequestSchema: z.ZodMiniType<GetSegmentJobRequest> =
  z.object({
    jobId: nonEmptyString,
    signal: abortSignalSchema,
  });

export const responseBodyRecordSchema = z.record(z.string(), z.unknown());

export const apiErrorBodySchema = z.object({
  requestId: z.optional(z.string()),
  request_id: z.optional(z.string()),
});

export const presignedUploadRawSchema: z.ZodMiniType<PresignedUploadRaw> =
  z.object({
    uploadUrl: urlString,
    inputS3Key: nonEmptyString,
    bucket: nonEmptyString,
    expiresIn: finiteNumber,
  });

export const segmentMaskRawSchema: z.ZodMiniType<SegmentMaskRaw> = z.object({
  key: nonEmptyString,
  score: finiteNumber,
  box: z.array(finiteNumber),
});

export const segmentResponseRawSchema: z.ZodMiniType<SegmentResponseRaw> =
  z.object({
    requestId: z.optional(z.string()),
    request_id: z.optional(z.string()),
    job_id: nonEmptyString,
    num_instances: finiteNumber,
    output_prefix: nonEmptyString,
    masks: z.array(segmentMaskRawSchema),
  });

export const segmentJobAcceptedRawSchema: z.ZodMiniType<SegmentJobAcceptedRaw> =
  z.object({
    requestId: z.optional(z.string()),
    request_id: z.optional(z.string()),
    job_id: nonEmptyString,
    type: z.enum(["image_batch", "video"]),
    status: z.literal("queued"),
    total_items: finiteNumber,
    poll_path: nonEmptyString,
  });

export const batchSegmentAcceptedRawSchema: z.ZodMiniType<BatchSegmentAcceptedRaw> =
  segmentJobAcceptedRawSchema;

export const batchSegmentMaskRawSchema: z.ZodMiniType<BatchSegmentMaskRaw> =
  z.object({
    key: nonEmptyString,
    score: z.optional(z.nullable(finiteNumber)),
    box: z.optional(z.nullable(z.array(finiteNumber))),
  });

export const segmentJobStatusItemRawSchema = z.object({
  jobId: nonEmptyString,
  inputS3Key: nonEmptyString,
  status: z.enum(["queued", "processing", "success", "failed"]),
  num_instances: z.optional(z.nullable(finiteNumber)),
  masks: z.optional(z.nullable(z.array(batchSegmentMaskRawSchema))),
  error: z.optional(z.nullable(nonEmptyString)),
  error_code: z.optional(z.nullable(nonEmptyString)),
});

export const segmentJobVideoStatusRawSchema = z.object({
  jobId: nonEmptyString,
  inputS3Key: nonEmptyString,
  status: z.enum(["queued", "processing", "success", "failed"]),
  output: z.optional(
    z.object({
      manifest_url: nonEmptyString,
      frames_url: nonEmptyString,
      output_s3_prefix: nonEmptyString,
      mask_encoding: nonEmptyString,
    }),
  ),
  counts: z.optional(
    z.object({
      frames_processed: finiteInteger,
      frames_with_masks: finiteInteger,
      total_masks: finiteInteger,
    }),
  ),
  error: z.optional(z.nullable(nonEmptyString)),
  error_code: z.optional(z.nullable(nonEmptyString)),
});

export const segmentJobStatusRawSchema: z.ZodMiniType<SegmentJobStatusRaw> =
  z.object({
    requestId: z.optional(z.string()),
    request_id: z.optional(z.string()),
    job_id: nonEmptyString,
    type: z.enum(["image_sync", "image_batch", "video"]),
    status: z.enum([
      "queued",
      "processing",
      "completed",
      "completed_with_errors",
      "failed",
    ]),
    total_items: finiteNumber,
    queued_items: finiteNumber,
    processing_items: finiteNumber,
    success_items: finiteNumber,
    failed_items: finiteNumber,
    items: z.optional(z.array(segmentJobStatusItemRawSchema)),
    video: z.optional(segmentJobVideoStatusRawSchema),
    error: z.optional(nonEmptyString),
    error_code: z.optional(nonEmptyString),
  });

export const batchSegmentStatusRawSchema: z.ZodMiniType<BatchSegmentStatusRaw> =
  segmentJobStatusRawSchema;

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
