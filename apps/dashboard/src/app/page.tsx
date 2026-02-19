import { Suspense } from "react";

import { OverviewPageContent } from "./_components/overview-page";
import { OverviewPageLoading } from "./_components/overview-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";
import { getBalanceForUser } from "@/lib/server/dashboard-queries";

async function HomeProtectedContent() {
  const session = await requirePageSession();
  const balance = await getBalanceForUser(session.user.id);

  return <OverviewPageContent balance={balance} userName={session.user.name} />;
}

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-330 flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<OverviewPageLoading />}>
        <HomeProtectedContent />
      </Suspense>
    </main>
  );
}
