import { Suspense } from "react";

import { RequestsPageContent } from "./_components/requests-page";
import { RequestsPageLoading } from "./_components/requests-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";

async function RequestsProtectedContent() {
  await requirePageSession();

  return <RequestsPageContent />;
}

export default function RequestsRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<RequestsPageLoading />}>
        <RequestsProtectedContent />
      </Suspense>
    </main>
  );
}
