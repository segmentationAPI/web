import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    APP_URL: z.url(),
  },
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
  },
  emptyStringAsUndefined: true,
});
