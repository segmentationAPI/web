import { db } from "@segmentation/db";
import * as schema from "@segmentation/db/schema/auth";
import { env } from "@segmentation/env/dashboard";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins"

import { initializeDynamoTokenBalance } from "./dynamo-balance";

function extractUserId(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = (value as { id?: unknown }).id;

  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  return id;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const userId = extractUserId(createdUser);

          if (!userId) {
            return;
          }

          await initializeDynamoTokenBalance(userId);
        },
      },
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies(), jwt()],
});
