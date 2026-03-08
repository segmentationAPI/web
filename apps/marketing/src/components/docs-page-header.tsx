import { DocsBreadcrumb, DocsEyebrow, DocsLead, DocsPageTitle } from "@/components/docs-primitives";

type DocsPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  current: string;
  eyebrow?: React.ReactNode;
};

export function DocsPageHeader({ title, description, current, eyebrow }: DocsPageHeaderProps) {
  return (
    <>
      <DocsBreadcrumb current={current} />

      <header className="reveal">
        <DocsPageTitle>{title}</DocsPageTitle>
        <DocsLead>{description}</DocsLead>
        {eyebrow ? <DocsEyebrow>{eyebrow}</DocsEyebrow> : null}
      </header>
    </>
  );
}
