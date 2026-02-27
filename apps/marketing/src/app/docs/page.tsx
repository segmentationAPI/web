import type { Metadata } from "next";

import { Braces, CloudUpload, DatabaseZap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "SegmentationAPI Docs | SAM 3 API",
  description:
    "Reference docs for SegmentationAPI endpoints, request formats, and upload workflows for SAM 3 segmentation.",
};

const segmentCurl = `curl -X POST \\
  https://api.segmentationapi.com/v1/segment \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "prompts": ["painting"],
    "inputS3Key": "inputs/demo-account/upload-001.png",
    "threshold": 0.5,
    "mask_threshold": 0.5
  }'`;

const segmentResponse = `{
  "requestId": "req_demo_001",
  "job_id": "job_demo_001",
  "num_instances": 2,
  "output_prefix": "outputs/demo-account/job_demo_001/",
  "masks": [
    {
      "key": "outputs/demo-account/job_demo_001/mask_0.png",
      "score": 0.6171875,
      "box": [378.41269841269843, 232.38095238095238, 761.9047619047619, 538.4126984126984]
    },
    {
      "key": "outputs/demo-account/job_demo_001/mask_1.png",
      "score": 0.89453125,
      "box": [300.95238095238096, 162.53968253968253, 838.0952380952381, 612.063492063492]
    }
  ]
}`;

const presignCurl = `curl -X POST \\
  https://api.segmentationapi.com/v1/uploads/presign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  `;

const presignResponse = `{
  "uploadUrl": "https://segmentation-assets-prod.s3.us-east-2.amazonaws.com/inputs/demo-account/upload-001.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=example",
  "s3Key": "inputs/demo-account/upload-001.png",
  "bucket": "segmentation-assets-prod",
  "expiresIn": 300
}`;

const uploadCurl = `curl -X PUT "https://s3.amazonaws.com/...signed-url..." \\
  -H "Content-Type: image/png" \\
  --data-binary "@frame-0001.png"`;

const videoAsyncCurl = `curl -X POST \\
  https://api.segmentationapi.com/v1/segment/video \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY" \\
  -d '{
    "inputS3Key": "inputs/demo-account/video-001.mp4",
    "points": [[320, 180]],
    "point_labels": [1]
  }'`;

const pollCurl = `curl -X GET \\
  https://api.segmentationapi.com/v1/segment/jobs/JOB_ID \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY"`;

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
            Two endpoints are enough to power production workflows: upload to S3 with a signed URL,
            then segment instantly from the returned S3 key.
          </p>
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <CloudUpload className="h-4 w-4" />
            Upload Flow (S3)
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">
            `POST /v1/uploads/presign` + Segment from S3 key
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Recommended for large files and client-side uploads. Presign first, upload directly to
            S3, then call segmentation with the returned `s3Key`.
          </p>
        </div>

        <div className="soft-divider" />

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            1. Request signed upload URL
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{presignCurl}</code>
          </pre>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{presignResponse}</code>
          </pre>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            2. Upload file to S3
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{uploadCurl}</code>
          </pre>
        </div>
      </section>

      <section className="glass-panel reveal space-y-5 rounded-[1.8rem] p-5 sm:space-y-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <DatabaseZap className="h-4 w-4" />
            Endpoint Example
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">`POST /v1/segment`</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Use this endpoint to run segmentation after uploading the source image and passing the
            `inputS3Key`.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
          <code>{segmentCurl}</code>
        </pre>
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Example response
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{segmentResponse}</code>
          </pre>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.6rem] p-5 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <DatabaseZap className="h-4 w-4 text-secondary" />
          Async jobs
        </p>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground sm:text-base">
            Video and batch requests are asynchronous. Create a job, then poll the unified status
            endpoint.
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{videoAsyncCurl}</code>
          </pre>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-3 text-[11px] leading-relaxed text-[#ffcaa9] sm:p-4 sm:text-sm">
            <code>{pollCurl}</code>
          </pre>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.6rem] p-5 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-secondary" />
          Auth and limits
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
          <li>Pass API keys as `x-api-key: ...` on every request.</li>
          <li>Presigned URLs are short-lived and single-use by default.</li>
          <li>
            Billing is token-based: $0.01 gets 2 tokens, with 1 token for S3 input upload and 1
            token for each segmentation run.
          </li>
        </ul>
      </section>
    </main>
  );
}
