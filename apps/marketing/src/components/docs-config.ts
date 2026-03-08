import {
  BookOpen,
  CloudUpload,
  FlaskConical,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type DocsPage = {
  href: string;
  title: string;
  description: string;
  group: "Getting Started" | "API Reference" | "Resources";
  icon: LucideIcon;
};

export const docsPages = [
  {
    href: "/docs",
    title: "Overview",
    description: "Platform overview, endpoint map, and the core integration flow.",
    group: "Getting Started",
    icon: BookOpen,
  },
  {
    href: "/docs/authentication",
    title: "Authentication",
    description: "API key management, request headers, and rate limits for all endpoints.",
    group: "Getting Started",
    icon: ShieldCheck,
  },
  {
    href: "/docs/upload",
    title: "Upload Flow",
    description: "Presigned URL generation, direct S3 upload, and task ID lifecycle.",
    group: "API Reference",
    icon: CloudUpload,
  },
  {
    href: "/docs/jobs",
    title: "Jobs",
    description: "Create segmentation jobs, track status, and retrieve finished results.",
    group: "API Reference",
    icon: Layers,
  },
  {
    href: "/docs/sam3-alternatives",
    title: "SAM3 Alternatives",
    description:
      "Benchmark comparisons, capability matrices, and deployment trade-offs across leading models.",
    group: "Resources",
    icon: FlaskConical,
  },
] as const satisfies readonly DocsPage[];

export const docsNavGroups = [
  {
    title: "Getting Started",
    items: docsPages.filter((page) => page.group === "Getting Started"),
  },
  {
    title: "API Reference",
    items: docsPages.filter((page) => page.group === "API Reference"),
  },
  {
    title: "Resources",
    items: docsPages.filter((page) => page.group === "Resources"),
  },
] as const;
