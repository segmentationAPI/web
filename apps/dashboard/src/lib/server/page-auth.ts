import "server-only";

import { auth } from "@segmentation/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getActiveApiKeyForuser } from "./queries";

export const requirePageSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return session;
});

export const requireActiveApiKey = cache(async () => {
  const session = await requirePageSession();
  const activeApiKey = await getActiveApiKeyForuser(session.user.id);

  if (!activeApiKey) {
    redirect("/");
  }

  return activeApiKey;
});
