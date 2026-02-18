import { auth } from "@segmentation/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requirePageSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}
