import type { Metadata } from "next";
import Link from "next/link";

import { CloudUpload, Layers, ShieldCheck, FlaskConical, ArrowRight } from "lucide-react";

import { docsPages } from "@/components/docs-config";
import { DocsPageNav } from "@/components/docs-page-nav";
import { DocsPageHeader } from "@/components/docs-page-header";
import {
  DocsEndpointCard,
  DocsH2,
  DocsMethodBadge,
  DocsProse,
  DocsSection,
} from "@/components/docs-primitives";

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
            SegmentationAPI provides a simple upload-then-segment workflow powered by Meta&apos;s
            SAM 3. Upload media, submit segmentation jobs with text prompts, and retrieve
            high-quality masks through four REST endpoints.
          </>
        }
      />

      <DocsSection>
        <DocsH2>Quick Start</DocsH2>
        <DocsProse>
          <p>The integration flow consists of three steps:</p>
          <ul>
            <li>
              <strong>Upload</strong> — Request a presigned URL from{" "}
              <code className="text-secondary font-mono text-sm">POST /v1/uploads/presign</code>,
              then PUT your file directly to S3.
            </li>
            <li>
              <strong>Segment</strong> — Submit the returned task ID(s) with text prompts to{" "}
              <code className="text-secondary font-mono text-sm">POST /v1/jobs</code> to queue a
              segmentation job.
            </li>
            <li>
              <strong>Retrieve</strong> — Poll{" "}
              <code className="text-secondary font-mono text-sm">GET /v1/jobs/{"{jobId}"}</code>{" "}
              until processing completes, then download masks from the result URLs.
            </li>
          </ul>
        </DocsProse>
      </DocsSection>

      <DocsSection>
        <DocsH2>Endpoints</DocsH2>
        <div className="grid gap-3 sm:grid-cols-2">
          {endpoints.map((ep) => (
            <DocsEndpointCard key={`${ep.method}-${ep.path}`}>
              <div className="mb-2 flex items-center gap-2.5">
                <DocsMethodBadge method={ep.method} />
                <span className="text-foreground font-mono text-sm">{ep.path}</span>
              </div>
              <p className="text-muted-foreground text-sm">{ep.description}</p>
            </DocsEndpointCard>
          ))}
        </div>
      </DocsSection>

      <DocsSection>
        <DocsH2>Explore</DocsH2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <DocsEndpointCard key={section.href} className="group">
              <Link href={section.href} className="flex flex-col">
                <div className="mb-2 flex items-center gap-2.5">
                  <section.icon className="text-primary h-4 w-4 opacity-70" />
                  <span className="font-display text-base font-semibold">{section.title}</span>
                  <ArrowRight className="text-muted-foreground ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-muted-foreground text-sm">{section.description}</p>
              </Link>
            </DocsEndpointCard>
          ))}
        </div>
      </DocsSection>

      <DocsPageNav next={{ href: "/docs/authentication", title: "Authentication" }} />
    </>
  );
}
