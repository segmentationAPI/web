import Link from "next/link";

type DocsPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  current: string;
  eyebrow?: React.ReactNode;
};

export function DocsPageHeader({
  title,
  description,
  current,
  eyebrow,
}: DocsPageHeaderProps) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="docs-breadcrumb reveal">
        <Link href="/docs">Docs</Link>
        <span aria-hidden="true" className="separator">
          /
        </span>
        <span aria-current="page">{current}</span>
      </nav>

      <header className="reveal">
        <h1 className="docs-h1">{title}</h1>
        <p className="docs-lead">{description}</p>
        {eyebrow ? <div className="docs-eyebrow">{eyebrow}</div> : null}
      </header>
    </>
  );
}
