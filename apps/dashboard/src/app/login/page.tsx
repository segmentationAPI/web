import { Suspense } from "react";

import { auth } from "@segmentation/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";

type LoginSearchParams = {
  callbackURL?: string;
  error?: string;
};

export default function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
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

function LoginFallback() {
  return <AuthForm callbackURL="/" />;
}
