import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getLabelProjectForUser } from "@/lib/server/dashboard-queries";
import { requirePageSession } from "@/lib/server/page-auth";
import { ProjectDetailLoading } from "./_components/project-detail-loading";
import { ProjectDetail } from "./_components/project-detail";

async function ProtectedContent({ projectId }: { projectId: string }) {
  const session = await requirePageSession();
  const project = await getLabelProjectForUser({ projectId, userId: session.user.id });

  if (!project) notFound();

  return <ProjectDetail project={project} />;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Suspense fallback={<ProjectDetailLoading />}>
        <ProtectedContent projectId={id} />
      </Suspense>
    </main>
  );
}
