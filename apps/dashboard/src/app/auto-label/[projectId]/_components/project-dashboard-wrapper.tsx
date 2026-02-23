"use client";

import { ProjectDashboard } from "./project-dashboard";

export function ProjectDashboardClientWrapper({ projectId }: { projectId: string }) {
    return <ProjectDashboard projectId={projectId} />;
}
