import { Suspense } from "react";

import { OverviewPageContent } from "./_components/overview-page";
import { OverviewPageLoading } from "./_components/overview-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";

async function HomeProtectedContent() {
  const session = await requirePageSession();

  return <OverviewPageContent userName={session.user.name} />;
}

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<OverviewPageLoading />}>
        <HomeProtectedContent />
      </Suspense>
    </main>
  );
}
