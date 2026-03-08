import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavLink {
  href: Route;
  title: string;
}

export function DocsPageNav({ prev, next }: { prev?: NavLink; next?: NavLink }) {
  return (
    <nav aria-label="Pagination" className="docs-nav-footer">
      {prev ? (
        <Link href={prev.href} className="docs-nav-footer-link" data-dir="prev">
          <span className="label">
            <ChevronLeft className="mb-px inline h-3 w-3" /> Previous
          </span>
          <span className="title">{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className="docs-nav-footer-spacer" />
      )}
      {next ? (
        <Link href={next.href} className="docs-nav-footer-link" data-dir="next">
          <span className="label">
            Next <ChevronRight className="mb-px inline h-3 w-3" />
          </span>
          <span className="title">{next.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className="docs-nav-footer-spacer" />
      )}
    </nav>
  );
}
