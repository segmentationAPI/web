import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected a valid date string",
});

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    publishedAt: isoDate,
    updatedAt: isoDate.optional(),
    tags: z.array(z.string().trim().min(1)),
    published: z.boolean(),
  }),
});

export const collections = { blog };
