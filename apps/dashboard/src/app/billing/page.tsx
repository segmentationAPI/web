import { Suspense } from "react";

import { BillingPageContent } from "./_components/billing-page";
import { BillingPageLoading } from "./_components/billing-page-loading";
import { requirePageSession } from "@/lib/server/page-auth";

async function BillingProtectedContent() {
  await requirePageSession();

  return <BillingPageContent />;
}

export default function BillingRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<BillingPageLoading />}>
        <BillingProtectedContent />
      </Suspense>
    </main>
  );
}
