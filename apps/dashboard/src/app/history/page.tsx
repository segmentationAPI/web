import { Suspense } from "react";

import {
  HistoryListPanelShell,
  HistoryResultsSection,
} from "./_components/history-list-panel";
import { HistoryPageLoading } from "./_components/history-page-loading";
import { normalizeHistoryListQuery, type HistoryListQuery } from "./_components/history-query";
import { listJobsForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

type HistoryRoutePageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    mode?: string;
  }>;
};

async function HistoryResultsContent({
  query,
}: {
  query: HistoryListQuery;
}) {
  const session = await requirePageSession();
  const limit = 25;
  const offset = (query.page - 1) * limit;

  const jobs = await listJobsForUser({
    limit,
    offset,
    query: query.q,
    status: query.status,
    mode: query.mode,
    userId: session.user.id,
  });

  return (
    <HistoryResultsSection
      jobs={jobs.items}
      currentPage={query.page}
      hasNextPage={jobs.nextOffset !== null}
      hasPreviousPage={query.page > 1}
      query={query}
      totalCount={jobs.totalCount}
    />
  );
}

async function HistoryShellContent({ searchParams }: HistoryRoutePageProps) {
  const query = normalizeHistoryListQuery(await searchParams);
  const suspenseKey = `${query.page}|${query.q}|${query.status}|${query.mode}`;

  return (
    <HistoryListPanelShell query={query}>
      <Suspense key={suspenseKey} fallback={<HistoryPageLoading resultsOnly />}>
        <HistoryResultsContent query={query} />
      </Suspense>
    </HistoryListPanelShell>
  );
}

export default function HistoryRoutePage(props: HistoryRoutePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-330 flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<HistoryPageLoading />}>
        <HistoryShellContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
