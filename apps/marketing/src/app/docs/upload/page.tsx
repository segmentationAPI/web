import type { Metadata } from "next";

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
  title: "Upload Flow | SegmentationAPI Docs",
  description:
    "Request presigned upload URLs, upload files to S3, and manage task IDs for segmentation jobs.",
};

const presignRequest = `curl -X POST \\
  https://api.segmentationapi.com/v1/uploads/presign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "contentType": "image/png"
  }'`;

const presignResponse = `{
  "uploadUrl": "https://segmentation-assets-prod.s3.us-east-2.amazonaws.com/inputs/acct_demo_123/0000_a1b2c3d4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=example",
  "taskId": "0000_a1b2c3d4",
  "bucket": "segmentation-assets-prod",
  "expiresIn": 300
}`;

const uploadFile = `curl -X PUT "https://s3.amazonaws.com/...signed-url..." \\
  -H "Content-Type: image/png" \\
  --data-binary "@frame-0001.png"`;

export default function UploadFlowPage() {
  return (
    <>
      <DocsPageHeader
        current="Upload Flow"
        title="Upload Flow"
        description={
          <>
            Media uploads use presigned S3 URLs. Request one with{" "}
            <code className="font-mono text-sm text-secondary">POST /v1/uploads/presign</code>
            , upload directly to S3, then use the returned{" "}
            <code className="font-mono text-sm text-secondary">taskId</code> when
            creating segmentation jobs.
          </>
        }
      />

      <div className="docs-prose reveal">
        <h2 className="docs-h2">Step 1 — Request a Presigned URL</h2>
        <p>
          Send a POST request with the <code>contentType</code> of the file you want
          to upload. The API returns a signed URL valid for 5 minutes, along with the{" "}
          <code>taskId</code> that identifies this upload in subsequent job requests.
        </p>

        <DocsCodeBlock code={presignRequest} label="Request" />

        <h3 className="docs-h3">Response</h3>
        <DocsCodeBlock code={presignResponse} label="200 OK" />

        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Field</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Type</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">uploadUrl</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string</code></TableCell>
              <TableCell className="text-muted-foreground">Presigned S3 PUT URL — expires after <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">expiresIn</code> seconds</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">taskId</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string</code></TableCell>
              <TableCell className="text-muted-foreground">Unique identifier for this upload; use in <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">POST /v1/jobs</code></TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">bucket</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string</code></TableCell>
              <TableCell className="text-muted-foreground">S3 bucket name (informational)</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">expiresIn</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">number</code></TableCell>
              <TableCell className="text-muted-foreground">URL validity in seconds (default 300)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="docs-prose reveal">
        <h2 className="docs-h2">Step 2 — Upload File to S3</h2>
        <p>
          Use the <code>uploadUrl</code> from the presign response to PUT the
          raw file bytes directly to S3. Set the <code>Content-Type</code> header
          to match the <code>contentType</code> you specified in the presign request.
        </p>

        <DocsCodeBlock code={uploadFile} label="PUT to S3" />

        <div className="docs-callout">
          <strong>Content-Type must match.</strong> The Content-Type in your PUT
          request must match the contentType from the presign request, or S3
          will reject the upload with a <code>403</code>.
        </div>
      </div>

      <div className="docs-prose reveal">
        <h2 className="docs-h2">Supported Formats</h2>
        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Type</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Supported Formats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Images</TableCell>
              <TableCell>
                <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">image/png</code>{", "}
                <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">image/jpeg</code>{", "}
                <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">image/webp</code>
              </TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell className="text-muted-foreground">Video</TableCell>
              <TableCell>
                <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">video/mp4</code>{", "}
                <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">video/webm</code>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DocsPageNav
        prev={{ href: "/docs/authentication", title: "Authentication" }}
        next={{ href: "/docs/jobs", title: "Jobs" }}
      />
    </>
  );
}
