"use client";

import { UnifiedStudio } from "./unified-studio";

type StudioPageContentProps = {
  userId: string;
};

export function StudioPageContent({ userId }: StudioPageContentProps) {
  return (
    <main className="mx-auto flex h-[calc(100svh-61px)] min-h-[calc(100svh-61px)] w-full max-w-[1320px] flex-col overflow-hidden box-border px-3 py-3 sm:px-6 sm:py-4">
      <UnifiedStudio userId={userId} />
    </main>
  );
}
