import { Suspense } from "react";

import { OverviewPageContent } from "./_components/overview-page";
import { OverviewPageLoading } from "./_components/overview-page-loading";
import { ApiKeysPageContent } from "./api-keys/_components/api-keys-page";
import { ApiKeysPageLoading } from "./api-keys/_components/api-keys-page-loading";
import { BillingPageContent } from "./billing/_components/billing-page";
import { BillingPageLoading } from "./billing/_components/billing-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";
import { getBalanceForUser, listApiKeysForUser } from "@/lib/server/dashboard-queries";

async function HomeProtectedContent() {
  const session = await requirePageSession();
  const [balance, keys] = await Promise.all([
    getBalanceForUser(session.user.id),
    listApiKeysForUser(session.user.id),
  ]);

  return (
    <>
      <OverviewPageContent balance={balance} userName={session.user.name} />
      <ApiKeysPageContent initialKeys={keys} />
      <BillingPageContent balance={balance} />
    </>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-330 flex-col gap-4 px-2 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense
        fallback={
          <>
            <OverviewPageLoading />
            <ApiKeysPageLoading />
            <BillingPageLoading />
          </>
        }
      >
        <HomeProtectedContent />
      </Suspense>
    </main>
  );
}
