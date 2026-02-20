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
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<PlaygroundPageLoading />}>
        <PlaygroundProtectedContent />
      </Suspense>
    </main>
  );
}
