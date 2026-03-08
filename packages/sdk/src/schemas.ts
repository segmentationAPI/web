import * as z from "zod/mini";

export const JobTypeSchema = z.union([z.literal("image"), z.literal("video")]);

export const JobQueueStatusSchema = z.literal("queued");

export const JobTaskStatusSchema = z.union([
  z.literal("queued"),
  z.literal("running"),
  z.literal("success"),
  z.literal("failed"),
]);

export const JobSummaryStatusSchema = z.union([
  z.literal("queued"),
  z.literal("processing"),
  z.literal("completed"),
  z.literal("completed_with_errors"),
  z.literal("failed"),
]);

export const JobRequestSchema = z.object({
  type: JobTypeSchema,
  tasks: z.array(z.string()),
  prompts: z.optional(z.array(z.string())),
  generatePreview: z.optional(z.boolean()),
  threshold: z.optional(z.number()),
  maskThreshold: z.optional(z.number()),
});

export const JobResponseSchema = z.object({
  jobId: z.string(),
  type: JobTypeSchema,
  status: JobQueueStatusSchema,
  totalItems: z.number(),
});

export const AccountResponseSchema = z.object({
  accountId: z.string(),
});

export const JobStatusResponseSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  type: JobTypeSchema,
  tasks: z.array(
    z.object({
      taskId: z.string(),
      status: JobTaskStatusSchema,
      error: z.optional(z.string()),
    }),
  ),
});

export const JobListItemResponseSchema = z.object({
  jobId: z.string(),
  type: JobTypeSchema,
  status: JobSummaryStatusSchema,
  totalItems: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JobListItemResponse = z.infer<typeof JobListItemResponseSchema>;

export const JobListResponseSchema = z.object({
  items: z.array(JobListItemResponseSchema),
  nextToken: z.union([z.string(), z.null()]),
});
export type JobListResponse = z.infer<typeof JobListResponseSchema>;

const NullableStringSchema = z.union([z.string(), z.null()]);

export const ImageOutputMaskSchema = z.object({
  maskIndex: z.number(),
  score: z.optional(z.union([z.number(), z.null()])),
  confidence: z.optional(z.union([z.number(), z.null()])),
  url: z.string(),
});

export const ImageOutputManifestItemSchema = z.object({
  taskId: z.string(),
  inputId: z.string(),
  units: z.number(),
  generatedAt: z.string(),
  masks: z.array(ImageOutputMaskSchema),
  previewUrl: z.optional(NullableStringSchema),
});

export const ImageOutputManifestSchema = z.object({
  accountId: z.string(),
  jobId: z.string(),
  type: z.literal("image"),
  prompts: z.array(z.string()),
  items: z.array(ImageOutputManifestItemSchema),
});

export const VideoOutputManifestItemSchema = z.object({
  taskId: z.string(),
  inputId: z.string(),
  units: z.number(),
  generatedAt: z.string(),
  previewUrl: z.optional(NullableStringSchema),
  fps: z.optional(z.number()),
  numFrames: z.optional(z.number()),
  maxFrames: z.optional(z.number()),
  scoreThreshold: z.optional(z.number()),
  counts: z.optional(z.record(z.string(), z.number())),
  masks: z.string(),
});

export const VideoOutputManifestSchema = z.object({
  accountId: z.string(),
  jobId: z.string(),
  type: z.literal("video"),
  prompts: z.array(z.string()),
  items: z.array(VideoOutputManifestItemSchema),
});

export const OutputManifestSchema = z.union([ImageOutputManifestSchema, VideoOutputManifestSchema]);

export const PresignRequestSchema = z.object({
  contentType: z.union([
    z.literal("image/jpeg"),
    z.literal("image/png"),
    z.literal("image/webp"),
    z.literal("video/mp4"),
  ]),
});

export const PresignResponseSchema = z.object({
  uploadUrl: z.url(),
  taskId: z.string(),
  expiresIn: z.number(),
});
