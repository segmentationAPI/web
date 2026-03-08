import type { Metadata } from "next";

import { Braces, CloudUpload, DatabaseZap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "SegmentationAPI Docs | SAM 3 API",
  description:
    "Reference docs for SegmentationAPI upload and async job endpoints for SAM 3 segmentation.",
};

const presignCurl = `curl -X POST \\
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

const uploadCurl = `curl -X PUT "https://s3.amazonaws.com/...signed-url..." \\
  -H "Content-Type: image/png" \\
  --data-binary "@frame-0001.png"`;

const createImageJobCurl = `curl -X POST \\
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

const createVideoJobCurl = `curl -X POST \\
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

const listJobsCurl = `curl -X GET \\
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

const getJobCurl = `curl -X GET \\
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

const endpoints = [
  {
    method: "POST",
    path: "/v1/uploads/presign",
    detail: "Creates a short-lived upload URL and returns the taskId you will submit in jobs.",
  },
  {
    method: "GET",
    path: "/v1/jobs",
    detail: "Lists async jobs for the authenticated account. Supports limit and nextToken.",
  },
  {
    method: "POST",
    path: "/v1/jobs",
    detail: "Queues an image or video segmentation job for 1 to 100 uploaded taskIds.",
  },
  {
    method: "GET",
    path: "/v1/jobs/{jobId}",
    detail: "Returns per-item job status with queued, running, success, or failed states.",
  },
] as const;

function CodeBlock({ code, className = "" }: { code: string; className?: string }) {
  return (
    <pre
      className={`overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm ${className}`}
    >
      <code>{code}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-4 pb-20 pt-6 sm:gap-10 sm:px-8 sm:pt-8">
      <section className="space-y-5 reveal sm:space-y-6">
        <p className="tone-chip">
          <Braces className="h-4 w-4" />
          API Documentation
        </p>
        <div className="space-y-3 sm:space-y-4">
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl lg:text-6xl">
            SegmentationAPI Reference
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base lg:text-lg">
            The public docs focus on the upload-plus-jobs workflow. Upload media once, submit one or
            more task ids with required prompts to `/v1/jobs`, then poll or list jobs until
            processing completes.
          </p>
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <Braces className="h-4 w-4" />
            Endpoint Inventory
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">Current OpenAPI endpoints</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {endpoints.map((endpoint) => (
            <div
              key={`${endpoint.method}-${endpoint.path}`}
              className="rounded-[1.4rem] border border-border/70 bg-background/40 p-4"
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {endpoint.method}
              </p>
              <p className="mt-2 font-mono text-sm text-foreground sm:text-base">{endpoint.path}</p>
              <p className="mt-2 text-sm text-muted-foreground">{endpoint.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <CloudUpload className="h-4 w-4" />
            Upload Flow
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">POST /v1/uploads/presign</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Uploads are now keyed by `taskId`, not by passing raw S3 object paths into processing
            endpoints. Request a presigned URL, upload the file, then submit the returned `taskId`
            in a job request.
          </p>
        </div>

        <div className="soft-divider" />

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            1. Request signed upload URL
          </p>
          <CodeBlock code={presignCurl} />
          <CodeBlock code={presignResponse} />
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            2. Upload file to S3
          </p>
          <CodeBlock code={uploadCurl} />
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <DatabaseZap className="h-4 w-4" />
            Job Creation
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">POST /v1/jobs</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Create asynchronous image or video jobs by sending a `type` and an `items` array of
            uploaded task ids. Prompts are required and must include at least one non-empty string.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex h-full flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Image job example
            </p>
            <CodeBlock code={createImageJobCurl} className="flex-1" />
          </div>
          <div className="flex h-full flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Video job example
            </p>
            <CodeBlock code={createVideoJobCurl} className="flex-1" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Accepted response
          </p>
          <CodeBlock code={createJobResponse} />
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <DatabaseZap className="h-4 w-4" />
            Job Monitoring
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">
            GET /v1/jobs and GET /v1/jobs/{"{jobId}"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Use the collection route for paginated history, then query a specific job when you need
            per-item task status.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex h-full flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              List jobs
            </p>
            <CodeBlock code={listJobsCurl} />
            <CodeBlock code={listJobsResponse} className="flex-1" />
          </div>
          <div className="flex h-full flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Get a job
            </p>
            <CodeBlock code={getJobCurl} />
            <CodeBlock code={getJobResponse} className="flex-1" />
          </div>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.6rem] p-5 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-secondary" />
          Request rules
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
          <li>
            Pass API keys as `x-api-key: ...` on every `/v1/uploads/presign` and `/v1/jobs` request.
          </li>
          <li>`POST /v1/jobs` accepts between 1 and 100 task ids in `items`.</li>
          <li>
            `POST /v1/jobs` requires a non-empty `prompts` array for both image and video jobs.
          </li>
          <li>`GET /v1/jobs` supports `limit` up to 100 and cursor pagination with `nextToken`.</li>
        </ul>
      </section>
    </main>
  );
}
