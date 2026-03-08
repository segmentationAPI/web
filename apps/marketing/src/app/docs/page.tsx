import type { Metadata } from "next";
import Link from "next/link";

import { CloudUpload, Layers, ShieldCheck, FlaskConical, ArrowRight } from "lucide-react";

import { docsPages } from "@/components/docs-config";
import { DocsPageNav } from "@/components/docs-page-nav";
import { DocsPageHeader } from "@/components/docs-page-header";

export const metadata: Metadata = {
  title: "Documentation | SegmentationAPI",
  description:
    "Complete API reference for SegmentationAPI — upload media, create segmentation jobs, and retrieve results with SAM 3.",
};

const sectionIcons = {
  "/docs/authentication": ShieldCheck,
  "/docs/upload": CloudUpload,
  "/docs/jobs": Layers,
  "/docs/sam3-alternatives": FlaskConical,
} as const;

const sections = docsPages
  .filter((page) => page.href !== "/docs")
  .map((page) => ({
    ...page,
    icon: sectionIcons[page.href as keyof typeof sectionIcons],
  }));

const endpoints = [
  {
    method: "POST" as const,
    path: "/v1/uploads/presign",
    description: "Request a short-lived presigned upload URL and receive a task ID.",
  },
  {
    method: "POST" as const,
    path: "/v1/jobs",
    description: "Queue an async image or video segmentation job.",
  },
  {
    method: "GET" as const,
    path: "/v1/jobs",
    description: "List paginated jobs for the authenticated account.",
  },
  {
    method: "GET" as const,
    path: "/v1/jobs/{jobId}",
    description: "Retrieve per-item status for a specific job.",
  },
];

export default function DocsOverviewPage() {
  return (
    <>
      <DocsPageHeader
        current="Overview"
        title="Documentation"
        description={
          <>
            SegmentationAPI provides a simple upload-then-segment workflow powered by
            Meta&apos;s SAM 3. Upload media, submit segmentation jobs with text prompts,
            and retrieve high-quality masks through four REST endpoints.
          </>
        }
      />

      <div className="reveal">
        <h2 className="docs-h2">Quick Start</h2>
        <div className="docs-prose">
          <p>The integration flow consists of three steps:</p>
          <ul>
            <li>
              <strong>Upload</strong> — Request a presigned URL from{" "}
              <code className="font-mono text-sm text-secondary">POST /v1/uploads/presign</code>,
              then PUT your file directly to S3.
            </li>
            <li>
              <strong>Segment</strong> — Submit the returned task ID(s) with text prompts to{" "}
              <code className="font-mono text-sm text-secondary">POST /v1/jobs</code> to
              queue a segmentation job.
            </li>
            <li>
              <strong>Retrieve</strong> — Poll{" "}
              <code className="font-mono text-sm text-secondary">GET /v1/jobs/{"{jobId}"}</code>{" "}
              until processing completes, then download masks from the result URLs.
            </li>
          </ul>
        </div>
      </div>

      <div className="reveal">
        <h2 className="docs-h2">Endpoints</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {endpoints.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="docs-endpoint-card">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="docs-method-badge" data-method={ep.method}>
                  {ep.method}
                </span>
                <span className="font-mono text-sm text-foreground">{ep.path}</span>
              </div>
              <p className="text-sm text-muted-foreground">{ep.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="reveal">
        <h2 className="docs-h2">Explore</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="docs-endpoint-card group flex flex-col"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <section.icon className="h-4 w-4 text-primary opacity-70" />
                <span className="font-display text-base font-semibold">{section.title}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <DocsPageNav next={{ href: "/docs/authentication", title: "Authentication" }} />
    </>
  );
}
