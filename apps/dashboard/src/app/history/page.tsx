import { Suspense } from "react";

import { RequestsPageContent } from "./_components/requests-page";
import { RequestsPageLoading } from "./_components/requests-page-loading";
import { getJobDetailForUser, listJobsForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

type HistoryRoutePageProps = {
  searchParams: Promise<{
    jobId?: string;
    page?: string;
  }>;
};

async function HistoryProtectedContent({ searchParams }: HistoryRoutePageProps) {
  const session = await requirePageSession();
  const { jobId, page } = await searchParams;
  const parsedPage = Number(page);
  const currentPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  const limit = 25;
  const offset = (currentPage - 1) * limit;

  const jobs = await listJobsForUser({
    limit,
    offset,
    userId: session.user.id,
  });

  const selectedJob = jobId
    ? await getJobDetailForUser({
        jobId,
        userId: session.user.id,
      })
    : null;

  return (
    <RequestsPageContent
      jobs={jobs.items}
      selectedJob={selectedJob}
      selectedJobId={jobId ?? null}
      currentPage={currentPage}
      hasNextPage={jobs.nextOffset !== null}
      hasPreviousPage={currentPage > 1}
    />
  );
}

export default function HistoryRoutePage(props: HistoryRoutePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<RequestsPageLoading />}>
        <HistoryProtectedContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
