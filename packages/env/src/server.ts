import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_SUCCESS_URL: z.url(),
    STRIPE_CANCEL_URL: z.url(),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().min(1).default("us-east-2"),
    AWS_DYNAMO_API_KEYS_TABLE: z.string().min(1),
    AWS_DYNAMO_BALANCE_TABLE: z.string().min(1),
    AWS_S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
