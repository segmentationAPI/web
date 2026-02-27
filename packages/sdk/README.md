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

const result = await client.segment({
  prompts: ["painting"],
  inputS3Key: presigned.inputS3Key,
  threshold: 0.5,
  maskThreshold: 0.5,
});

console.log(result.jobId);
console.log(result.outputUrl); // https://assets.segmentationapi.com/<output_prefix>
console.log(result.masks[0]?.url);
```

## One-call Flow

```ts
const result = await client.uploadAndSegment({
  prompts: ["painting"],
  data: imageBytes,
  contentType: "image/png",
  threshold: 0.5,
  maskThreshold: 0.5,
});
```

## Batch Flow

```ts
const accepted = await client.createBatchSegmentJob({
  prompts: ["cat"],
  threshold: 0.5,
  maskThreshold: 0.5,
  items: [
    { inputS3Key: "inputs/acct_123/cat-1.png" },
    { inputS3Key: "inputs/acct_123/cat-2.png" },
  ],
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
console.log(status.status, status.successItems, status.failedItems);
console.log(status.items[0]?.masks?.[0]?.url);
```

## Video Segmentation Flow

```ts
const accepted = await client.segmentVideo({
  file: videoFile, // Blob/File/Uint8Array
  fps: 2, // or numFrames
  maxFrames: 120,
  points: [
    [320, 180],
    [410, 260],
  ],
  pointLabels: [1, 0],
  pointObjectIds: [1, 1],
  frameIdx: 0,
  clearOldInputs: true,
});

const status = await client.getSegmentJob({ jobId: accepted.jobId });
if (status.video?.status === "success") {
  console.log(status.video.output?.manifestUrl);
  console.log(status.video.output?.framesUrl);
  console.log(status.video.counts?.totalMasks);
}
```

The SDK uploads the video to S3 first using a presigned URL, then submits the
video segmentation request with the uploaded `inputS3Key`.

Video segmentation supports visual prompts only:

- Provide exactly one prompt mode: `points` or `boxes`
- Use matching optional ID arrays (`pointObjectIds` or `boxObjectIds`)
- Do not send text prompts (`text` is unsupported)
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
  await client.segment({ prompt: ["painting"], inputS3Key: "inputs/file.png" });
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
