"use client";

import { UnifiedStudio } from "./unified-studio";

type StudioPageContentProps = {
  userId: string;
};

export function StudioPageContent({ userId }: StudioPageContentProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <UnifiedStudio userId={userId} />
    </main>
  );
}
