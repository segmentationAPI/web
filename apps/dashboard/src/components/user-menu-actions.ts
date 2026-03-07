"use server";

import { db } from "@segmentation/db";
import { user } from "@segmentation/db/schema/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePageSession } from "@/lib/server/page-auth";

const setActiveApiKeyInputSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "API key is required")
    .min(16, "API key appears incomplete")
    .startsWith("sk_live_", "API key must start with sk_live_"),
});

type SetActiveApiKeyResult =
  | {
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export async function setActiveApiKeyAction(
  input: z.input<typeof setActiveApiKeyInputSchema>,
): Promise<SetActiveApiKeyResult> {
  const parsed = setActiveApiKeyInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid API key",
      ok: false,
    };
  }

  const session = await requirePageSession();

  try {
    await db
      .update(user)
      .set({
        activeApiKey: parsed.data.apiKey,
      })
      .where(eq(user.id, session.user.id));

    revalidatePath("/");
    revalidatePath("/studio");
    revalidatePath("/history");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to set active API key", error);
    return {
      error: "Failed to save API key",
      ok: false,
    };
  }
}
