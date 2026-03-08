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
  title: "Jobs | SegmentationAPI Docs",
  description:
    "Create async image and video segmentation jobs, list job history, and retrieve per-item results.",
};

const createImageJob = `curl -X POST \\
  https://api.segmentationapi.com/v1/jobs \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "type": "image",
    "items": ["0000_a1b2c3d4"],
    "prompts": ["painting"],
    "threshold": 0.5,
    "maskThreshold": 0.5,
    "generatePreview": true
  }'`;

const createVideoJob = `curl -X POST \\
  https://api.segmentationapi.com/v1/jobs \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "type": "video",
    "items": ["0001_e5f6g7h8"],
    "prompts": ["person"],
    "generatePreview": true
  }'`;

const createJobResponse = `{
  "jobId": "job-abc-987",
  "type": "image",
  "status": "queued",
  "totalItems": 1
}`;

const listJobsRequest = `curl -X GET \\
  "https://api.segmentationapi.com/v1/jobs?limit=20" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY"`;

const listJobsResponse = `{
  "items": [
    {
      "jobId": "job-abc-987",
      "type": "image",
      "status": "completed",
      "totalItems": 1,
      "createdAt": "2026-03-07T12:00:00Z",
      "updatedAt": "2026-03-07T12:01:00Z"
    }
  ],
  "nextToken": "eyJvZmZzZXQiOjIwfQ=="
}`;

const getJobRequest = `curl -X GET \\
  https://api.segmentationapi.com/v1/jobs/job-abc-987 \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY"`;

const getJobResponse = `{
  "userId": "user-123",
  "jobId": "job-abc-987",
  "type": "image",
  "items": [
    {
      "taskId": "0000_a1b2c3d4",
      "status": "success"
    }
  ]
}`;

export default function JobsPage() {
  return (
    <>
      <DocsPageHeader
        current="Jobs"
        title="Jobs"
        description={
          <>
            Create asynchronous segmentation jobs for images or videos, then poll
            for results. Each job processes 1-100 uploaded task IDs with the text
            prompts you specify.
          </>
        }
      />

      {/* Create Job */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">Create a Job</h2>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="docs-method-badge" data-method="POST">POST</span>
          <span className="font-mono text-sm text-foreground">/v1/jobs</span>
        </div>
        <p>
          Submit a <code>type</code> (<code>&quot;image&quot;</code> or{" "}
          <code>&quot;video&quot;</code>), an <code>items</code> array of task IDs
          from the upload flow, and a <code>prompts</code> array with at least one
          non-empty text phrase.
        </p>

        <h3 className="docs-h3">Request Body</h3>
        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Field</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Type</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Required</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">type</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string</code></TableCell>
              <TableCell className="text-muted-foreground">Yes</TableCell>
              <TableCell className="text-muted-foreground"><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">&quot;image&quot;</code> or <code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">&quot;video&quot;</code></TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">items</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string[]</code></TableCell>
              <TableCell className="text-muted-foreground">Yes</TableCell>
              <TableCell className="text-muted-foreground">1–100 task IDs from presign uploads</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">prompts</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string[]</code></TableCell>
              <TableCell className="text-muted-foreground">Yes</TableCell>
              <TableCell className="text-muted-foreground">Text prompts for segmentation targets</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">threshold</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">number</code></TableCell>
              <TableCell className="text-muted-foreground">No</TableCell>
              <TableCell className="text-muted-foreground">Detection confidence threshold (0–1, image only)</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">maskThreshold</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">number</code></TableCell>
              <TableCell className="text-muted-foreground">No</TableCell>
              <TableCell className="text-muted-foreground">Mask binarization threshold (0–1, image only)</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">generatePreview</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">boolean</code></TableCell>
              <TableCell className="text-muted-foreground">No</TableCell>
              <TableCell className="text-muted-foreground">Generate overlay preview image/video</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocsCodeBlock code={createImageJob} label="Image job" />
          <DocsCodeBlock code={createVideoJob} label="Video job" />
        </div>

        <h3 className="docs-h3">Response</h3>
        <DocsCodeBlock code={createJobResponse} label="202 Accepted" />
      </div>

      {/* List Jobs */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">List Jobs</h2>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="docs-method-badge" data-method="GET">GET</span>
          <span className="font-mono text-sm text-foreground">/v1/jobs</span>
        </div>
        <p>
          Retrieve a paginated list of jobs for your account. Pass <code>limit</code>{" "}
          (max 100) and <code>nextToken</code> for cursor-based pagination.
        </p>

        <DocsCodeBlock code={listJobsRequest} label="Request" />
        <DocsCodeBlock code={listJobsResponse} label="200 OK" />

        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Query Param</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Type</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Default</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">limit</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">number</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">20</code></TableCell>
              <TableCell className="text-muted-foreground">Results per page (max 100)</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">nextToken</code></TableCell>
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">string</code></TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">Cursor from previous response</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Get Job */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">Get a Job</h2>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="docs-method-badge" data-method="GET">GET</span>
          <span className="font-mono text-sm text-foreground">/v1/jobs/{"{jobId}"}</span>
        </div>
        <p>
          Fetch full details for a single job including per-item task status.
          Each item moves through <code>queued</code> → <code>running</code> →{" "}
          <code>success</code> | <code>failed</code>.
        </p>

        <DocsCodeBlock code={getJobRequest} label="Request" />
        <DocsCodeBlock code={getJobResponse} label="200 OK" />
      </div>

      {/* Status lifecycle */}
      <div className="docs-prose reveal">
        <h2 className="docs-h2">Job Status Lifecycle</h2>
        <Table className="my-4">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Status</TableHead>
              <TableHead className="font-mono text-[0.68rem] uppercase tracking-widest">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">queued</code></TableCell>
              <TableCell className="text-muted-foreground">Job is accepted and waiting for a processing slot</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">running</code></TableCell>
              <TableCell className="text-muted-foreground">Segmentation is actively processing</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">success</code></TableCell>
              <TableCell className="text-muted-foreground">All items completed — masks are available</TableCell>
            </TableRow>
            <TableRow className="border-border/15">
              <TableCell><code className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">failed</code></TableCell>
              <TableCell className="text-muted-foreground">Processing failed — check item-level errors for details</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="docs-callout">
          <strong>Polling tip:</strong> Start polling after 2–3 seconds. Use exponential
          backoff with a max interval of 10 seconds. Most image jobs complete in under
          30 seconds.
        </div>
      </div>

      <DocsPageNav
        prev={{ href: "/docs/upload", title: "Upload Flow" }}
        next={{ href: "/docs/sam3-alternatives", title: "SAM3 Alternatives" }}
      />
    </>
  );
}
