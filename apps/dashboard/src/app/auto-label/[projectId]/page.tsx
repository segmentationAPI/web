import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ProjectSetup } from "./_components/project-setup";
import { ProjectDashboardClientWrapper } from "./_components/project-dashboard-wrapper";

async function ProjectContent({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;
    const isSetup = projectId === "new";

    return isSetup ? (
        <ProjectSetup />
    ) : (
        <ProjectDashboardClientWrapper projectId={projectId} />
    );
}

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
    return (
        <main className="mx-auto flex w-full max-w-330 flex-col gap-6 px-3 pb-10 pt-4 sm:px-6">
            <Link
                href="/auto-label"
                className="inline-flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="size-3" />
                All projects
            </Link>

            <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-muted-foreground">Loading...</div>}>
                <ProjectContent params={params} />
            </Suspense>
        </main>
    );
}
