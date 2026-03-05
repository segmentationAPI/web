import { Suspense } from "react";
import { notFound } from "next/navigation";

import { HistoryDetailPanel } from "../_components/history-detail-panel";
import { HistoryPageLoading } from "../_components/history-page-loading";
import { normalizeHistoryListQuery } from "../_components/history-query";
import { getJobDetailForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

type HistoryDetailRoutePageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    mode?: string;
  }>;
};

async function HistoryDetailProtectedContent({ params, searchParams }: HistoryDetailRoutePageProps) {
  const session = await requirePageSession();
  const { jobId } = await params;
  const historyQuery = normalizeHistoryListQuery(await searchParams);
  const selectedJob = await getJobDetailForUser({
    jobId,
    userId: session.user.id,
  });

  if (!selectedJob) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <HistoryDetailPanel selectedJob={selectedJob} historyQuery={historyQuery} />
    </main>
  );
}

export default function HistoryDetailRoutePage(props: HistoryDetailRoutePageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
          <HistoryPageLoading showDetail />
        </main>
      }
    >
      <HistoryDetailProtectedContent {...props} />
    </Suspense>
  );
}
