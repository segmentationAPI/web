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
  title: "Results | SegmentationAPI Docs",
  description:
    "Request a results archive, poll until it is ready, and read output_manifest.json to retrieve image and video segmentation masks.",
};

const createDownloadRequest = `curl -X POST \\
  https://api.segmentationapi.com/v1/jobs/job-abc-987/download \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY"`;

const createDownloadResponse = `{
  "jobId": "job-abc-987",
  "status": "pending",
  "expiresAt": null,
  "downloadUrl": null,
  "retryAfterSeconds": 2,
  "error": null
}`;

const getDownloadRequest = `curl -X GET \\
  https://api.segmentationapi.com/v1/jobs/job-abc-987/download \\
  -H "x-api-key: YOUR_SEGMENTATION_API_KEY"`;

const getDownloadResponse = `{
  "jobId": "job-abc-987",
  "status": "ready",
  "expiresAt": "2026-03-08T12:01:00Z",
  "downloadUrl": "https://segmentation-assets-prod.s3.us-east-2.amazonaws.com/downloads/acct_demo_123/job-abc-987/job-job-abc-987.zip?X-Amz-Signature=example",
  "retryAfterSeconds": null,
  "error": null
}`;

const imageManifest = `{
  "accountId": "acct_demo_123",
  "jobId": "job-abc-987",
  "type": "image",
  "prompts": ["painting"],
  "items": [
    {
      "taskId": "0000_a1b2c3d4",
      "inputId": "0000_a1b2c3d4",
      "units": 1,
      "generatedAt": "2026-03-07T12:01:00Z",
      "previewUrl": "preview/0000_a1b2c3d4.png",
      "masks": [
        { "maskIndex": 0, "confidence": 0.97, "url": "masks/0000_a1b2c3d4/0.png" },
        { "maskIndex": 1, "confidence": 0.91, "url": "masks/0000_a1b2c3d4/1.png" }
      ]
    }
  ]
}`;

const videoManifest = `{
  "accountId": "acct_demo_123",
  "jobId": "job-def-654",
  "type": "video",
  "prompts": ["person"],
  "items": [
    {
      "taskId": "0001_e5f6g7h8",
      "inputId": "0001_e5f6g7h8",
      "units": 120,
      "generatedAt": "2026-03-07T12:05:00Z",
      "previewUrl": "preview/0001_e5f6g7h8.mp4",
      "masks": "masks/0001_e5f6g7h8/masks.json",
      "counts": {
        "framesProcessed": 120,
        "framesWithMasks": 118,
        "totalMasks": 240
      },
      "fps": 6,
      "scoreThreshold": 0.5
    }
  ]
}`;

export default function ResultsPage() {
  return (
    <>
      <DocsPageHeader
        current="Results"
        title="Results"
        description={
          <>
            The job status endpoint never returns masks. Once a job has succeeded, request a results
            archive — a zip containing{" "}
            <code className="text-secondary font-mono text-sm">output_manifest.json</code> plus the
            mask artifacts — then poll until it is ready and download it.
          </>
        }
      />

      {/* Retrieve Results */}
      <DocsSection>
        <DocsProse>
          <DocsH2>Retrieve Results</DocsH2>

          <DocsH3>Step 1 — Request the Archive</DocsH3>
          <div className="mb-3 flex items-center gap-2.5">
            <DocsMethodBadge method="POST" />
            <span className="text-foreground font-mono text-sm">/v1/jobs/{"{jobId}"}/download</span>
          </div>
          <p>
            Kick off (or reuse) the archive build. Returns a download record whose{" "}
            <DocsInlineCode>status</DocsInlineCode> is <DocsInlineCode>pending</DocsInlineCode>,{" "}
            <DocsInlineCode>processing</DocsInlineCode>, or <DocsInlineCode>ready</DocsInlineCode>.
          </p>

          <DocsCodeBlock code={createDownloadRequest} label="Request" />
          <DocsCodeBlock code={createDownloadResponse} label="202 Accepted" />

          <DocsCallout>
            <strong>Job must have succeeded.</strong> Requesting a download before the job reaches{" "}
            <DocsInlineCode>success</DocsInlineCode> returns{" "}
            <DocsInlineCode>409 job_not_downloadable</DocsInlineCode>. Poll{" "}
            <DocsInlineCode>GET /v1/jobs/{"{jobId}"}</DocsInlineCode> first.
          </DocsCallout>

          <DocsH3>Step 2 — Poll Until Ready</DocsH3>
          <div className="mb-3 flex items-center gap-2.5">
            <DocsMethodBadge method="GET" />
            <span className="text-foreground font-mono text-sm">/v1/jobs/{"{jobId}"}/download</span>
          </div>
          <p>
            Poll until <DocsInlineCode>status</DocsInlineCode> is{" "}
            <DocsInlineCode>ready</DocsInlineCode>, waiting{" "}
            <DocsInlineCode>retryAfterSeconds</DocsInlineCode> between requests (2s while{" "}
            <DocsInlineCode>pending</DocsInlineCode>, 5s while{" "}
            <DocsInlineCode>processing</DocsInlineCode>). When ready, the response includes a
            short-lived presigned <DocsInlineCode>downloadUrl</DocsInlineCode>.
          </p>

          <DocsCodeBlock code={getDownloadRequest} label="Request" />
          <DocsCodeBlock code={getDownloadResponse} label="200 OK" />

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
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    status
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <DocsInlineCode>pending</DocsInlineCode> ·{" "}
                  <DocsInlineCode>processing</DocsInlineCode> ·{" "}
                  <DocsInlineCode>ready</DocsInlineCode> · <DocsInlineCode>failed</DocsInlineCode>
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    downloadUrl
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string | null
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Presigned zip URL, present once <DocsInlineCode>ready</DocsInlineCode> (expires in
                  ~5 minutes)
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    retryAfterSeconds
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    number | null
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Suggested wait before polling again
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    expiresAt
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string | null
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  When the archive is purged (retained ~24h)
                </TableCell>
              </TableRow>
              <TableRow className="border-border/15">
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    error
                  </code>
                </TableCell>
                <TableCell>
                  <code className="bg-secondary/10 text-secondary rounded px-1.5 py-0.5 font-mono text-xs">
                    string | null
                  </code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  Failure reason when <DocsInlineCode>status</DocsInlineCode> is{" "}
                  <DocsInlineCode>failed</DocsInlineCode>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <DocsCallout>
            Calling <DocsInlineCode>GET</DocsInlineCode> before you have{" "}
            <DocsInlineCode>POST</DocsInlineCode>ed a download request returns{" "}
            <DocsInlineCode>404 download_not_requested</DocsInlineCode>.
          </DocsCallout>

          <DocsH3>Step 3 — Read the Manifest</DocsH3>
          <p>
            Download and unzip <DocsInlineCode>downloadUrl</DocsInlineCode>. The archive contains{" "}
            <DocsInlineCode>output_manifest.json</DocsInlineCode> and the referenced mask artifacts.
            The manifest shape differs by job type.
          </p>

          <p>
            <strong>Image jobs</strong> — each item carries a <DocsInlineCode>masks</DocsInlineCode>{" "}
            array of per-instance PNG masks with a <DocsInlineCode>maskIndex</DocsInlineCode>,{" "}
            <DocsInlineCode>confidence</DocsInlineCode>, and archive-relative{" "}
            <DocsInlineCode>url</DocsInlineCode>.
          </p>
          <DocsCodeBlock code={imageManifest} label="output_manifest.json (image)" />

          <p>
            <strong>Video jobs</strong> — <DocsInlineCode>masks</DocsInlineCode> is a path to a
            per-frame COCO-RLE artifact (not individual PNGs), alongside{" "}
            <DocsInlineCode>counts</DocsInlineCode> and the sampling settings used. A baked preview
            MP4 is referenced by <DocsInlineCode>previewUrl</DocsInlineCode> when{" "}
            <DocsInlineCode>generatePreview</DocsInlineCode> was set.
          </p>
          <DocsCodeBlock code={videoManifest} label="output_manifest.json (video)" />
        </DocsProse>
      </DocsSection>

      <DocsPageNav
        prev={{ href: "/docs/jobs", title: "Jobs" }}
        next={{ href: "/docs/sam3-alternatives", title: "SAM3 Alternatives" }}
      />
    </>
  );
}
