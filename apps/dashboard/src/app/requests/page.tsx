import { Suspense } from "react";

import { RequestsPageContent } from "./_components/requests-page";
import { RequestsPageLoading } from "./_components/requests-page-loading";
import { getJobDetailForUser, listJobsForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";

type RequestsRoutePageProps = {
  searchParams: Promise<{
    jobId?: string;
  }>;
};

async function RequestsProtectedContent({ searchParams }: RequestsRoutePageProps) {
  const session = await requirePageSession();
  const { jobId } = await searchParams;

  const jobs = await listJobsForUser({
    limit: 25,
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
    />
  );
}

export default function RequestsRoutePage(props: RequestsRoutePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <Suspense fallback={<RequestsPageLoading />}>
        <RequestsProtectedContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
