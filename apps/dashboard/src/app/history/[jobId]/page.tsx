import { Suspense } from "react";
import { notFound } from "next/navigation";

import { HistoryDetailPanel } from "../_components/history-detail-panel";
import { HistoryPageLoading } from "../_components/history-page-loading";
import { HistoryPageShell } from "../_components/history-shared";
import { getJobSummaryForUser } from "@/lib/server/queries";
import { requirePageSession } from "@/lib/server/page-auth";

type HistoryDetailRoutePageProps = {
  params: Promise<{ jobId: string }>;
};

async function HistoryDetailProtectedContent({ params }: HistoryDetailRoutePageProps) {
  const session = await requirePageSession();
  const { jobId } = await params;
  const selectedJob = await getJobSummaryForUser({
    jobId,
    userId: session.user.id,
  });

  if (!selectedJob) {
    notFound();
  }

  return (
    <HistoryPageShell>
      <HistoryDetailPanel selectedJob={selectedJob} />
    </HistoryPageShell>
  );
}

export default function HistoryDetailRoutePage(props: HistoryDetailRoutePageProps) {
  return (
    <Suspense
      fallback={
        <HistoryPageShell>
          <HistoryPageLoading showDetail />
        </HistoryPageShell>
      }
    >
      <HistoryDetailProtectedContent {...props} />
    </Suspense>
  );
}
