import { Suspense } from "react";

import { requirePageSession } from "@/lib/server/page-auth";
import { StudioPageContent } from "./_components/studio-page-content";

export const metadata = {
  title: "Studio — Segmentation API Dashboard",
  description: "Unified workspace for interactive and project-based segmentation.",
};

async function StudioProtectedContent() {
  const session = await requirePageSession();

  return <StudioPageContent userId={session.user.id} />;
}

function StudioLoading() {
  return (
    <main className="mx-auto flex h-[calc(100svh-61px)] min-h-[calc(100svh-61px)] w-full max-w-[1320px] flex-col overflow-hidden box-border px-3 py-3 sm:px-6 sm:py-4">
      <div className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Loading studio...
        </p>
      </div>
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioProtectedContent />
    </Suspense>
  );
}
