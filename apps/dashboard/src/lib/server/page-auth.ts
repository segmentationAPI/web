import { auth } from "@segmentation/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const requirePageSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return session;
});
