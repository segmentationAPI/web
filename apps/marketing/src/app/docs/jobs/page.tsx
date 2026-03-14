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
import {
  DocsCallout,
  DocsH2,
  DocsH3,
  DocsInlineCode,
  DocsMethodBadge,
  DocsProse,
  DocsSection,
} from "@/components/docs-primitives";

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
    "tasks": ["0000_a1b2c3d4"],
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
    "tasks": ["0001_e5f6g7h8"],
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
  "tasks": [
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
            Create asynchronous segmentation jobs for images or videos, then poll for results. Each
            job processes 1-100 uploaded task IDs with the text prompts you specify.
          </>
        }
      />

      {/* Create Job */}
      <DocsSection>
        <DocsProse>
          <DocsH2>Create a Job</DocsH2>
          <div className="mb-3 flex items-center gap-2.5">
            <DocsMethodBadge method="POST" />
            <span className="text-foreground font-mono text-sm">/v1/jobs</span>
          </div>
          <p>
            Submit a <DocsInlineCode>type</DocsInlineCode> (
            <DocsInlineCode>&quot;image&quot;</DocsInlineCode> or{" "}
            <DocsInlineCode>&quot;video&quot;</DocsInlineCode>), a{" "}
            <DocsInlineCode>tasks</DocsInlineCode> array of task IDs from the upload flow, and a{" "}
            <DocsInlineCode>prompts</DocsInlineCode> array with at least one non-empty text phrase.
          </p>

          <DocsH3>Request Body</DocsH3>
          <Table className="my-4">
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Field
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Required
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    type
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">Yes</TableCell>
                <TableCell className="text-muted-foreground">
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    &quot;image&quot;
                  </code>{" "}
                  or{" "}
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    &quot;video&quot;
                  </code>
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    tasks
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string[]
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">Yes</TableCell>
                <TableCell className="text-muted-foreground">
                  1–100 task IDs from presign uploads
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    prompts
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string[]
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">Yes</TableCell>
                <TableCell className="text-muted-foreground">
                  Text prompts for segmentation targets
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    threshold
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    number
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">No</TableCell>
                <TableCell className="text-muted-foreground">
                  Detection confidence threshold (0–1, image only)
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    maskThreshold
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    number
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">No</TableCell>
                <TableCell className="text-muted-foreground">
                  Mask binarization threshold (0–1, image only)
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    generatePreview
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    boolean
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">No</TableCell>
                <TableCell className="text-muted-foreground">
                  Generate overlay preview image/video
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="grid gap-4 lg:grid-cols-2">
            <DocsCodeBlock code={createImageJob} label="Image job" />
            <DocsCodeBlock code={createVideoJob} label="Video job" />
          </div>

          <DocsH3>Response</DocsH3>
          <DocsCodeBlock code={createJobResponse} label="202 Accepted" />
        </DocsProse>
      </DocsSection>

      {/* List Jobs */}
      <DocsSection>
        <DocsProse>
          <DocsH2>List Jobs</DocsH2>
          <div className="mb-3 flex items-center gap-2.5">
            <DocsMethodBadge method="GET" />
            <span className="text-foreground font-mono text-sm">/v1/jobs</span>
          </div>
          <p>
            Retrieve a paginated list of jobs for your account. Pass{" "}
            <DocsInlineCode>limit</DocsInlineCode> (max 100) and{" "}
            <DocsInlineCode>nextToken</DocsInlineCode> for cursor-based pagination.
          </p>

          <DocsCodeBlock code={listJobsRequest} label="Request" />
          <DocsCodeBlock code={listJobsResponse} label="200 OK" />

          <Table className="my-4">
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Query Param
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Default
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    limit
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    number
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    20
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">Results per page (max 100)</TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    nextToken
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">
                  Cursor from previous response
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DocsProse>
      </DocsSection>

      {/* Get Job */}
      <DocsSection>
        <DocsProse>
          <DocsH2>Get a Job</DocsH2>
          <div className="mb-3 flex items-center gap-2.5">
            <DocsMethodBadge method="GET" />
            <span className="text-foreground font-mono text-sm">/v1/jobs/{"{jobId}"}</span>
          </div>
          <p>
            Fetch full details for a single job including per-task status. Each task moves
            through <DocsInlineCode>queued</DocsInlineCode> →{" "}
            <DocsInlineCode>processing</DocsInlineCode> → <DocsInlineCode>success</DocsInlineCode> |{" "}
            <DocsInlineCode>failed</DocsInlineCode>.
          </p>

          <DocsCodeBlock code={getJobRequest} label="Request" />
          <DocsCodeBlock code={getJobResponse} label="200 OK" />
        </DocsProse>
      </DocsSection>

      {/* Status lifecycle */}
      <DocsSection>
        <DocsProse>
          <DocsH2>Job Status Lifecycle</DocsH2>
          <Table className="my-4">
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="font-mono text-[0.68rem] tracking-widest uppercase">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    queued
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Job is accepted and waiting for a processing slot
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    processing
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Segmentation is actively processing
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    success
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  All tasks completed — masks are available
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    failed
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Processing failed — check task-level errors for details
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <DocsCallout>
            <strong>Polling tip:</strong> Start polling after 2–3 seconds. Use exponential backoff
            with a max interval of 10 seconds. Most image jobs complete in under 30 seconds.
          </DocsCallout>
        </DocsProse>
      </DocsSection>

      <DocsPageNav
        prev={{ href: "/docs/upload", title: "Upload Flow" }}
        next={{ href: "/docs/sam3-alternatives", title: "SAM3 Alternatives" }}
      />
    </>
  );
}
