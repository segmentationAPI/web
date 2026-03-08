import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DocsNavCard } from "@/components/docs-primitives";

interface NavLink {
  href: Route;
  title: string;
}

export function DocsPageNav({ prev, next }: { prev?: NavLink; next?: NavLink }) {
  return (
    <nav
      aria-label="Pagination"
      className="border-primary/18 mt-16 grid grid-cols-1 gap-3 border-t pt-8 min-[480px]:grid-cols-2 min-[480px]:gap-4"
    >
      {prev ? (
        <DocsNavCard
          href={prev.href}
          label={
            <>
              <ChevronLeft className="mb-px inline h-3 w-3" /> Previous
            </>
          }
          title={prev.title}
        />
      ) : (
        <span aria-hidden="true" className="hidden min-[480px]:block" />
      )}
      {next ? (
        <DocsNavCard
          href={next.href}
          align="right"
          label={
            <>
              Next <ChevronRight className="mb-px inline h-3 w-3" />
            </>
          }
          title={next.title}
        />
      ) : (
        <span aria-hidden="true" className="hidden min-[480px]:block" />
      )}
    </nav>
  );
}
