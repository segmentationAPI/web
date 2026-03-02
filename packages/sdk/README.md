# @segmentationapi/sdk

Official JavaScript SDK for the Segmentation API.

## Install

```bash
npm install @segmentationapi/sdk
```

## Quickstart

```ts
import { SegmentationClient } from "@segmentationapi/sdk";

const client = new SegmentationClient({
  apiKey: process.env.SEGMENTATION_API_KEY!,
});

const presigned = await client.createPresignedUpload({
  contentType: "image/png",
});

await client.uploadImage({
  uploadUrl: presigned.uploadUrl,
  data: imageBytes, // Blob/File/Buffer/Uint8Array
  contentType: "image/png",
});

const accepted = await client.createJob({
  type: "image_batch",
  prompts: ["painting"],
  items: [{ taskId: presigned.taskId }],
  threshold: 0.5,
  maskThreshold: 0.5,
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
console.log(status.status, status.successItems, status.failedItems);
```

## Upload + Create Job Flow

```ts
const accepted = await client.uploadAndCreateJob({
  type: "image_batch",
  prompts: ["painting"],
  files: [{ data: imageBytes, contentType: "image/png" }],
  threshold: 0.5,
  maskThreshold: 0.5,
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
console.log(status.status, status.successItems, status.failedItems);
```

## Batch Image Flow

```ts
const accepted = await client.createJob({
  type: "image_batch",
  prompts: ["cat"],
  threshold: 0.5,
  maskThreshold: 0.5,
  items: [
    { taskId: "0000_a1b2c3d4" },
    { taskId: "0001_e5f6g7h8" },
  ],
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
console.log(status.status, status.successItems, status.failedItems);
```

## Video Segmentation Flow

```ts
const accepted = await client.segmentVideo({
  file: videoFile, // Blob/File/Uint8Array
  fps: 2, // or numFrames
  maxFrames: 120,
  prompts: ["person"],
  frameIdx: 0,
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
if (status.video?.status === "success") {
  console.log(status.video.output?.framesUrl);
  console.log(status.video.output?.framesUrl);
  console.log(status.video.counts?.totalMasks);
}
```

The SDK uploads the video to S3 first using a presigned URL, then submits the
video job with the uploaded `taskId`.

Video segmentation supports text prompts only:

- Provide at least one prompt in `prompts`
- Do not send `points` or `boxes`
- Choose at most one sampling selector: `fps` or `numFrames`

## Client Options

```ts
const client = new SegmentationClient({
  apiKey: "sk_live_...",
  // optional in runtimes without global fetch
  fetch: customFetch,
});
```

```ts
const client = new SegmentationClient({
  jwt: userJwt,
  // optional in runtimes without global fetch
  fetch: customFetch,
});
```

Provide exactly one of `apiKey` or `jwt`.
The SDK uses fixed endpoints:

- API key auth: `https://api.segmentationapi.com/v1/...`
- JWT auth: `https://api.segmentationapi.com/v1/jwt/...`
- Asset URLs: `https://assets.segmentationapi.com/...`

## Error Handling

```ts
import {
  NetworkError,
  SegmentationApiError,
  UploadError,
  ValidationError,
} from "@segmentationapi/sdk";

try {
  await client.createJob({
    type: "image_batch",
    prompts: ["painting"],
    items: [{ taskId: "0000_a1b2c3d4" }],
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.operation, error.direction, error.issues);
  } else if (error instanceof SegmentationApiError) {
    console.error(error.status, error.requestId, error.body);
  } else if (error instanceof UploadError) {
    console.error(error.status, error.url, error.body);
  } else if (error instanceof NetworkError) {
    console.error(error.context, error.cause);
  }
}
```

The SDK validates method inputs and successful API response shapes at runtime using
`zod/mini`, and throws `ValidationError` when a payload is invalid.

## Security

Do not expose long-lived secrets in public frontend code. API keys should stay server-side, and JWT usage should follow your app's auth/session model.
