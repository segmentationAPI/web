import type { Metadata } from "next";

import {
  Braces,
  CloudUpload,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SegmentationAPI Docs | SAM 3 API",
  description:
    "Reference docs for SegmentationAPI endpoints, request formats, and upload workflows for SAM 3 segmentation.",
};

const segmentCurl = `curl https://api.segmenta.ai/v1/sam3/segment \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -F image="@street-scene.jpg" \\
  -F prompt='{"points":[[421,222],[501,252]],"labels":[1,0]}' \\
  -F response_format="mask+polygons+confidence"`;

const presignCurl = `curl https://api.segmenta.ai/uploads/presign \\
  -X POST \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "frame-0001.png",
    "contentType": "image/png"
  }'`;

const uploadCurl = `curl -X PUT "https://s3.amazonaws.com/...signed-url..." \\
  -H "Content-Type: image/png" \\
  --data-binary "@frame-0001.png"`;

const segmentFromUrlCurl = `curl https://api.segmenta.ai/v1/sam3/segment \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://cdn.segmenta.ai/uploads/frame-0001.png",
    "prompt": {
      "boxes": [[140, 96, 840, 640]]
    },
    "response_format": "mask+polygons+confidence"
  }'`;

export default function DocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pb-24 pt-8 sm:px-8">
      <section className="space-y-6 reveal">
        <p className="tone-chip">
          <Braces className="h-4 w-4" />
          API Documentation
        </p>
        <div className="space-y-4">
          <h1 className="font-display text-4xl tracking-tight sm:text-6xl">SegmentationAPI Reference</h1>
          <p className="max-w-3xl text-muted-foreground sm:text-lg">
            Two endpoints are enough to power full SAM 3 production workflows: upload to S3 with a
            signed URL, then segment instantly from file or URL.
          </p>
        </div>
      </section>

      <section className="glass-panel reveal space-y-6 rounded-[1.8rem] p-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <DatabaseZap className="h-4 w-4" />
            Endpoint Example
          </p>
          <h2 className="font-display text-3xl">`POST /v1/sam3/segment`</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Use this endpoint when you already have the source image locally or in memory.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-4 text-xs leading-relaxed text-[#ffcaa9] sm:text-sm">
          <code>{segmentCurl}</code>
        </pre>
      </section>

      <section className="glass-panel reveal space-y-6 rounded-[1.8rem] p-6 sm:p-8">
        <div>
          <p className="tone-chip mb-4">
            <CloudUpload className="h-4 w-4" />
            Upload Flow (S3)
          </p>
          <h2 className="font-display text-3xl">`POST /uploads/presign` + Segment from URL</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Recommended for large files and client-side uploads. Presign first, upload directly to
            S3, then call segmentation with the returned asset URL.
          </p>
        </div>

        <div className="soft-divider" />

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            1. Request signed upload URL
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-4 text-xs leading-relaxed text-[#ffcaa9] sm:text-sm">
            <code>{presignCurl}</code>
          </pre>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            2. Upload file to S3
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-4 text-xs leading-relaxed text-[#ffcaa9] sm:text-sm">
            <code>{uploadCurl}</code>
          </pre>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            3. Segment from uploaded URL
          </p>
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-[#07090d] p-4 text-xs leading-relaxed text-[#ffcaa9] sm:text-sm">
            <code>{segmentFromUrlCurl}</code>
          </pre>
        </div>
      </section>

      <section className="glass-panel reveal rounded-[1.6rem] p-6 sm:p-8">
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-secondary" />
          Auth and limits
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Pass API keys as `Authorization: Bearer ...` on every request.</li>
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
