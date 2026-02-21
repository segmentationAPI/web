import { Suspense } from "react";

import { ApiKeysPageContent } from "./_components/api-keys-page";
import { ApiKeysPageLoading } from "./_components/api-keys-page-loading";
import { listApiKeysForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

async function ApiKeysProtectedContent() {
  const session = await requirePageSession();
  const keys = await listApiKeysForUser(session.user.id);

  return <ApiKeysPageContent initialKeys={keys} />;
}

export default function ApiKeysRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<ApiKeysPageLoading />}>
        <ApiKeysProtectedContent />
      </Suspense>
    </main>
  );
}
