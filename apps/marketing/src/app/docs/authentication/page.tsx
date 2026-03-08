import type { Metadata } from "next";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocsCodeBlock } from "@/components/docs-code-block";
import { DocsPageNav } from "@/components/docs-page-nav";
import { DocsPageHeader } from "@/components/docs-page-header";

export const metadata: Metadata = {
  title: "Authentication | SegmentationAPI Docs",
  description:
    "API key authentication, required headers, and rate limits for SegmentationAPI endpoints.",
};

const exampleHeader = `curl -X POST https://api.segmentationapi.com/v1/uploads/presign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{"contentType": "image/png"}'`;

const errorResponse = `{
  "error": "Unauthorized",
  "message": "Missing or invalid API key"
}`;

export default function AuthenticationPage() {
  return (
    <>
      <DocsPageHeader
        current="Authentication"
        title="Authentication"
        description={
          <>
            All SegmentationAPI requests are authenticated using API keys passed in the request
            header. Keys are scoped to your account and can be managed from the{" "}
            <Link href="/" className="text-primary underline underline-offset-3">
              dashboard
            </Link>
            .
          </>
        }
      />

      <div className="docs-prose reveal">
        <h2 className="docs-h2">API Key Header</h2>
        <p>
          Include the <code>x-api-key</code> header on every request to{" "}
          <code>/v1/uploads/presign</code> and <code>/v1/jobs</code> endpoints.
        </p>

        <DocsCodeBlock code={exampleHeader} label="Example request" />

        <div className="docs-callout">
          <strong>Keep keys secret.</strong> Never expose API keys in client-side code or public
          repositories. Use environment variables or a secrets manager.
        </div>
      </div>

      <div className="docs-prose reveal">
        <h2 className="docs-h2">Error Responses</h2>
        <p>
          If the API key is missing, malformed, or revoked, the API returns a{" "}
          <code>401 Unauthorized</code> response:
        </p>
        <DocsCodeBlock code={errorResponse} label="401 Unauthorized" />
      </div>

      <div className="docs-prose reveal">
        <h2 className="docs-h2">Request Rules</h2>
        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                Rule
              </TableHead>
              <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                Detail
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Header name</TableCell>
              <TableCell>
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  x-api-key
                </code>
              </TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Required on</TableCell>
              <TableCell>
                All{" "}
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  /v1/*
                </code>{" "}
                endpoints
              </TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Job items limit</TableCell>
              <TableCell>
                1–100 task IDs per{" "}
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  POST /v1/jobs
                </code>
              </TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Prompts</TableCell>
              <TableCell>
                At least one non-empty string in the{" "}
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  prompts
                </code>{" "}
                array
              </TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Pagination</TableCell>
              <TableCell>
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  limit
                </code>{" "}
                up to 100; cursor via{" "}
                <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                  nextToken
                </code>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DocsPageNav
        prev={{ href: "/docs", title: "Overview" }}
        next={{ href: "/docs/upload", title: "Upload Flow" }}
      />
    </>
  );
}
