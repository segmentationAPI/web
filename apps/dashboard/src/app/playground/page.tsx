import { Suspense } from "react";

import { PlaygroundPageContent } from "./_components/playground-page";
import { PlaygroundPageLoading } from "./_components/playground-page-loading";
import { getBalanceForUser, listApiKeysForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";
import { env } from "@segmentation/env/server";

async function PlaygroundProtectedContent() {
  const session = await requirePageSession();
  const [balance, apiKeys] = await Promise.all([
    getBalanceForUser(session.user.id),
    listApiKeysForUser(session.user.id),
  ]);
  const cloudfrontBaseUrl = env.AWS_CLOUDFRONT_BASE_URL.replace(/\/+$/, "");

  return (
    <PlaygroundPageContent
      balance={balance}
      initialApiKeys={apiKeys}
      cloudfrontBaseUrl={cloudfrontBaseUrl}
    />
  );
}

export default function PlaygroundRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<PlaygroundPageLoading />}>
        <PlaygroundProtectedContent />
      </Suspense>
    </main>
  );
}
