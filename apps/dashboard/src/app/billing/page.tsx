import { Suspense } from "react";

import { BillingPageContent } from "./_components/billing-page";
import { BillingPageLoading } from "./_components/billing-page-loading";
import { getBalanceForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

async function BillingProtectedContent() {
  const session = await requirePageSession();
  const balance = await getBalanceForUser(session.user.id);

  return <BillingPageContent balance={balance} />;
}

export default function BillingRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<BillingPageLoading />}>
        <BillingProtectedContent />
      </Suspense>
    </main>
  );
}
