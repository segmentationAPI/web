import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  if (projectId === "new") {
    redirect("/studio/projects/new");
  }

  redirect(`/studio/projects/${projectId}`);
}
