import { getAllBlogPosts } from "@/lib/blog";
import { getBaseUrl } from "@/lib/site";

// llms.txt — a curated, Markdown map of our highest-value pages for LLMs and
// AI search tools (see https://llmstxt.org). Intentionally hand-picked, not a
// dump of every URL: that's the sitemap's job, and duplicating it here just
// wastes the model's tokens. Keep this list to our best citation-worthy pages.

type Link = {
  title: string;
  path: string;
  description: string;
};

const CORE_LINKS: Link[] = [
  {
    title: "SegmentationAPI",
    path: "/",
    description:
      "Production-grade API platform for Meta's Segment Anything Model 3 (SAM 3): fast masks, vector output, and enterprise-ready reliability.",
  },
  {
    title: "Pricing",
    path: "/pricing",
    description:
      "Simple token pricing — 1 token per processed image or video frame, $0.02 per token. No tiers or seat fees.",
  },
];

const DOCS_LINKS: Link[] = [
  {
    title: "Documentation",
    path: "/docs",
    description:
      "Complete REST API reference: upload media, create segmentation jobs, and retrieve results with SAM 3.",
  },
  {
    title: "Authentication",
    path: "/docs/authentication",
    description:
      "API key authentication, required headers, and rate limits for SegmentationAPI endpoints.",
  },
  {
    title: "Upload Flow",
    path: "/docs/upload",
    description:
      "Request presigned upload URLs, upload files to S3, and manage task IDs for segmentation jobs.",
  },
  {
    title: "Jobs",
    path: "/docs/jobs",
    description:
      "Create async image and video segmentation jobs, list job history, and retrieve per-item results.",
  },
  {
    title: "Results",
    path: "/docs/results",
    description:
      "Request a results archive, poll until ready, and read output_manifest.json to retrieve image and video masks.",
  },
  {
    title: "SAM 3 Alternatives",
    path: "/docs/sam3-alternatives",
    description:
      "Benchmark comparisons, capability matrices, and deployment trade-offs for SAM 3 and its leading alternatives.",
  },
];

function renderLink(baseUrl: string, link: Link): string {
  return `- [${link.title}](${baseUrl}${link.path}): ${link.description}`;
}

export async function GET(): Promise<Response> {
  const baseUrl = getBaseUrl();
  const posts = await getAllBlogPosts();

  const sections = [
    "# SegmentationAPI",
    "",
    "> SAM 3 API-as-a-Service: a production-grade REST API for Meta's Segment Anything Model 3. Upload an image or video, segment objects with text or visual prompts, and retrieve masks and vector output at scale.",
    "",
    "## Core",
    "",
    CORE_LINKS.map((link) => renderLink(baseUrl, link)).join("\n"),
    "",
    "## Documentation",
    "",
    DOCS_LINKS.map((link) => renderLink(baseUrl, link)).join("\n"),
  ];

  if (posts.length > 0) {
    sections.push(
      "",
      "## Blog",
      "",
      posts
        .map((post) =>
          renderLink(baseUrl, {
            title: post.metadata.title,
            path: post.href,
            description: post.metadata.description,
          }),
        )
        .join("\n"),
    );
  }

  const body = `${sections.join("\n")}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
