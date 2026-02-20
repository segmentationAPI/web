import { Suspense } from "react";

import { listLabelProjectsForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";
import { AutoLabelProjectsLoading } from "./_components/projects-page-loading";
import { AutoLabelProjectsPage } from "./_components/projects-page";

async function ProtectedContent() {
  const session = await requirePageSession();
  const projects = await listLabelProjectsForUser(session.user.id);

  return <AutoLabelProjectsPage initialProjects={projects} />;
}

export default function AutoLabelPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<AutoLabelProjectsLoading />}>
        <ProtectedContent />
      </Suspense>
    </main>
  );
}
