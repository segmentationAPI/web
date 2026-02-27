import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100).optional(),
  apiKeyId: z.string().optional(),
  prompts: z.array(z.string().min(1)).min(1).optional(),
  threshold: z.number().min(0).max(1).optional(),
  maskThreshold: z.number().min(0).max(1).optional(),
  latestRequestId: z.string().optional(),
});

export const registerImagesSchema = z.object({
  images: z
    .array(
      z.object({
        s3Path: z.string().min(1),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .min(1),
});
