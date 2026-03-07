import { Suspense } from "react";

import { HistoryListPanelShell, HistoryResultsSection } from "./_components/history-list-panel";
import { HistoryPageLoading } from "./_components/history-page-loading";
import { HistoryPageShell } from "./_components/history-shared";
import { normalizeHistoryListQuery, type HistoryListQuery } from "./_components/history-query";
import { listJobsForUser } from "@/lib/server/queries";
import { requirePageSession } from "@/lib/server/page-auth";

type HistoryRoutePageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    mode?: string;
  }>;
};

async function HistoryResultsContent({ query }: { query: HistoryListQuery }) {
  const session = await requirePageSession();
  const jobs = await listJobsForUser({
    limit: 25,
    query,
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
    <HistoryPageShell>
      <Suspense fallback={<HistoryPageLoading />}>
        <HistoryShellContent searchParams={props.searchParams} />
      </Suspense>
    </HistoryPageShell>
  );
}
