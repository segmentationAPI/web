import { Suspense } from "react";

import { ApiKeysPageContent } from "./_components/api-keys-page";
import { ApiKeysPageLoading } from "./_components/api-keys-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";

async function ApiKeysProtectedContent() {
  await requirePageSession();

  return <ApiKeysPageContent />;
}

export default function ApiKeysRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<ApiKeysPageLoading />}>
        <ApiKeysProtectedContent />
      </Suspense>
    </main>
  );
}
