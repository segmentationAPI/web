import { auth } from "@segmentation/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string; error?: string }>;
}) {
  const [requestHeaders, resolvedSearchParams] = await Promise.all([headers(), searchParams]);
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (session?.user) {
    redirect("/");
  }

  return (
    <AuthForm
      callbackURL={resolvedSearchParams.callbackURL || "/"}
      authError={resolvedSearchParams.error}
    />
  );
}
