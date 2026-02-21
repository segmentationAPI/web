import { Suspense } from "react";

import { PlaygroundPageLoading } from "./_components/playground-page-loading";
import { PlaygroundPageContent } from "./_components/playground-page";
import { requirePageSession } from "@/lib/server/page-auth";

async function PlaygroundProtectedContent() {
  await requirePageSession();

  return <PlaygroundPageContent />;
}

export default function PlaygroundRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<PlaygroundPageLoading />}>
        <PlaygroundProtectedContent />
      </Suspense>
    </main>
  );
}
