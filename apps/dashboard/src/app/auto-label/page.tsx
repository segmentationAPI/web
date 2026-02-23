import { Suspense } from "react";

import { ProjectsTable } from "./_components/projects-table";
import { ProjectsTableLoading } from "./_components/projects-table-loading";

export const metadata = {
    title: "Auto Label — Segmentation API Dashboard",
    description: "Manage your auto-labeling projects powered by SAM 3.",
};

import { getProjects } from "./actions";

async function AutoLabelContent() {
    const result = await getProjects();
    const initialProjects = result.ok ? result.projects : [];
    return <ProjectsTable initialProjects={initialProjects} />;
}

export default function AutoLabelPage() {
    return (
        <main className="mx-auto flex w-full max-w-330 flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
            <Suspense fallback={<ProjectsTableLoading />}>
                <AutoLabelContent />
            </Suspense>
        </main>
    );
}
