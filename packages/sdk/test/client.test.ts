import { describe, expect, it, vi } from "vitest";
import {
  NetworkError,
  SegmentationApiError,
  SegmentationClient,
  UploadError,
  ValidationError,
} from "../src";
import type { FetchFunction } from "../src";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function asFetchMock(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl) as unknown as FetchFunction & ReturnType<typeof vi.fn>;
}

function getHeaders(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

describe("SegmentationClient", () => {
  it("validates constructor options", () => {
    const fetchMock = asFetchMock(async () => new Response(null, { status: 200 }));

    expect(
      () =>
        new SegmentationClient({
          apiKey: "   ",
          fetch: fetchMock,
        }),
    ).toThrow(ValidationError);

    expect(
      () =>
        new SegmentationClient({
          fetch: fetchMock,
        } as unknown as ConstructorParameters<typeof SegmentationClient>[0]),
    ).toThrow(ValidationError);

    expect(
      () =>
        new SegmentationClient({
          apiKey: "test_key",
          jwt: "jwt_token",
          fetch: fetchMock,
        } as unknown as ConstructorParameters<typeof SegmentationClient>[0]),
    ).toThrow(ValidationError);

    expect(
      () =>
        new SegmentationClient({
          jwt: "   ",
          fetch: fetchMock,
        } as unknown as ConstructorParameters<typeof SegmentationClient>[0]),
    ).toThrow(ValidationError);
  });

  it("sends expected request for createPresignedUpload", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        uploadUrl: "https://upload.example.com/a",
        inputS3Key: "inputs/demo.png",
        bucket: "segmentation-assets-prod",
        expiresIn: 300,
      }),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.createPresignedUpload({
      contentType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/uploads/presign");
    expect(init.method).toBe("POST");
    expect(getHeaders(init).get("x-api-key")).toBe("test_key");
    expect(getHeaders(init).get("content-type")).toBe("image/png");
    expect(init.body).toBeUndefined();
    expect(result.inputS3Key).toBe("inputs/demo.png");
  });

  it("sends bearer authorization header when jwt is provided", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        uploadUrl: "https://upload.example.com/a",
        inputS3Key: "inputs/demo.png",
        bucket: "segmentation-assets-prod",
        expiresIn: 300,
      }),
    );

    const client = new SegmentationClient({
      jwt: "jwt_token",
      fetch: fetchMock,
    });

    await client.createPresignedUpload({ contentType: "image/png" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jwt/uploads/presign");
    const headers = getHeaders(init);
    expect(headers.get("authorization")).toBe("Bearer jwt_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("sends bearer authorization header for segment requests with jwt", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        requestId: "request-jwt",
        jobId: "job-jwt",
        numInstances: 1,
        outputPrefix: "outputs/job-jwt/",
        masks: [
          {
            key: "outputs/job-jwt/mask_0.png",
            score: 0.95,
            box: [1, 2, 3, 4],
          },
        ],
      }),
    );

    const client = new SegmentationClient({
      jwt: "jwt_segment_token",
      fetch: fetchMock,
    });

    await client.segment({
      prompts: ["painting"],
      inputS3Key: "inputs/demo.png",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jwt/segment");
    const headers = getHeaders(init);
    expect(headers.get("authorization")).toBe("Bearer jwt_segment_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("uploads video through presign before sending segmentVideo request", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);
      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/video-put",
          inputS3Key: "inputs/acct/video.mp4",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/video-put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/segment/video")) {
        return jsonResponse({
          requestId: "video-request-1",
          jobId: "video-job-1",
          type: "video",
          status: "queued",
          totalItems: 1,
          pollPath: "/v1/jobs/video-job-1",
        });
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.segmentVideo({
      file: new Uint8Array([1, 2, 3, 4]),
      fps: 2.5,
      maxFrames: 80,
      points: [
        [10, 20],
        [30, 40],
      ],
      pointLabels: [1, 0],
      pointObjectIds: [101, 101],
      frameIdx: 5,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [presignUrl, presignInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(presignUrl).toBe("https://api.segmentationapi.com/v1/uploads/presign");
    expect(getHeaders(presignInit).get("x-api-key")).toBe("test_key");
    expect(getHeaders(presignInit).get("content-type")).toBe("application/octet-stream");

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(uploadUrl).toBe("https://upload.example.com/video-put");
    expect(uploadInit.method).toBe("PUT");
    expect(getHeaders(uploadInit).get("content-type")).toBe("application/octet-stream");

    const [segmentUrl, segmentInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(segmentUrl).toBe("https://api.segmentationapi.com/v1/segment/video");
    expect(getHeaders(segmentInit).get("x-api-key")).toBe("test_key");
    expect(getHeaders(segmentInit).get("content-type")).toBe("application/json");
    const body = JSON.parse(String(segmentInit.body)) as Record<string, unknown>;
    expect(body.inputS3Key).toBe("inputs/acct/video.mp4");
    expect(body.fps).toBe(2.5);
    expect(body.maxFrames).toBe(80);
    expect(body.numFrames).toBeUndefined();
    expect(body.points).toEqual([
      [10, 20],
      [30, 40],
    ]);
    expect(body.pointLabels).toEqual([1, 0]);
    expect(body.pointObjectIds).toEqual([101, 101]);
    expect(body.frameIdx).toBe(5);

    expect(result.requestId).toBe("video-request-1");
    expect(result.jobId).toBe("video-job-1");
    expect(result.type).toBe("video");
    expect(result.status).toBe("queued");
    expect(result.pollPath).toBe("/v1/jobs/video-job-1");
  });

  it("sends bearer authorization header for segmentVideo requests with jwt", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);
      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/video-put-jwt",
          inputS3Key: "inputs/acct/video-jwt.mp4",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/video-put-jwt") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/segment/video")) {
        return jsonResponse({
          requestId: "video-request-jwt",
          jobId: "video-job-jwt",
          type: "video",
          status: "queued",
          totalItems: 1,
          pollPath: "/v1/jobs/video-job-jwt",
        });
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      jwt: "jwt_video_token",
      fetch: fetchMock,
    });

    await client.segmentVideo({
      file: new Uint8Array([9, 8, 7]),
      numFrames: 16,
      boxes: [[1, 2, 3, 4]],
      boxObjectIds: [1],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [presignUrl, presignInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(presignUrl).toBe("https://api.segmentationapi.com/v1/jwt/uploads/presign");
    expect(getHeaders(presignInit).get("authorization")).toBe("Bearer jwt_video_token");

    const [segmentUrl, segmentInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(segmentUrl).toBe("https://api.segmentationapi.com/v1/jwt/segment/video");
    const headers = getHeaders(segmentInit);
    expect(headers.get("authorization")).toBe("Bearer jwt_video_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("sends bearer authorization header for createBatchSegmentJob requests with jwt", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse(
        {
          requestId: "batch-jwt-1",
          jobId: "batch-job-jwt",
          type: "image_batch",
          status: "queued",
          totalItems: 1,
          pollPath: "/v1/jobs/batch-job-jwt",
        },
        202,
      ),
    );

    const client = new SegmentationClient({
      jwt: "jwt_batch_token",
      fetch: fetchMock,
    });

    await client.createBatchSegmentJob({
      prompts: ["cat"],
      items: [{ inputS3Key: "inputs/a.png" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jwt/segment/batch");
    const headers = getHeaders(init);
    expect(headers.get("authorization")).toBe("Bearer jwt_batch_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("sends bearer authorization header for uploadAndSegment requests with jwt", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);

      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/put",
          inputS3Key: "inputs/flow.png",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/segment")) {
        return jsonResponse({
          requestId: "request-jwt-3",
          jobId: "job-jwt-3",
          numInstances: 1,
          outputPrefix: "outputs/job-jwt-3/",
          masks: [
            {
              key: "outputs/job-jwt-3/mask_0.png",
              score: 0.9,
              box: [1, 2, 3, 4],
            },
          ],
        });
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      jwt: "jwt_upload_token",
      fetch: fetchMock,
    });

    await client.uploadAndSegment({
      prompts: ["painting"],
      data: new Uint8Array([7, 8, 9]),
      contentType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [presignUrl, presignInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(presignUrl).toBe("https://api.segmentationapi.com/v1/jwt/uploads/presign");
    expect(getHeaders(presignInit).get("authorization")).toBe("Bearer jwt_upload_token");
    expect(getHeaders(presignInit).get("x-api-key")).toBeNull();

    const [segmentUrl, segmentInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(segmentUrl).toBe("https://api.segmentationapi.com/v1/jwt/segment");
    expect(getHeaders(segmentInit).get("authorization")).toBe("Bearer jwt_upload_token");
    expect(getHeaders(segmentInit).get("x-api-key")).toBeNull();
  });

  it("fails fast on invalid createPresignedUpload input", async () => {
    const fetchMock = asFetchMock(async () => new Response(null, { status: 200 }));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(client.createPresignedUpload({ contentType: "   " })).rejects.toMatchObject({
      direction: "input",
      operation: "createPresignedUpload",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps segment request fields and normalizes response", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        requestId: "request-1",
        jobId: "job-1",
        numInstances: 1,
        outputPrefix: "outputs/job-1/",
        masks: [
          {
            key: "outputs/job-1/mask_0.png",
            score: 0.95,
            box: [1, 2, 3, 4],
          },
        ],
      }),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.segment({
      prompts: ["painting"],
      inputS3Key: "inputs/demo.png",
      threshold: 0.5,
      maskThreshold: 0.6,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.prompts).toEqual(["painting"]);
    expect(body.inputS3Key).toBe("inputs/demo.png");
    expect(body.threshold).toBe(0.5);
    expect(body.maskThreshold).toBe(0.6);

    expect(result.jobId).toBe("job-1");
    expect(result.numInstances).toBe(1);
    expect(result.outputUrl).toBe("https://assets.segmentationapi.com/outputs/job-1/");
    expect(result.masks[0].url).toBe("https://assets.segmentationapi.com/outputs/job-1/mask_0.png");
  });

  it("throws SegmentationApiError on API failure", async () => {
    const fetchMock = asFetchMock(
      async () =>
        new Response(JSON.stringify({ message: "invalid key", requestId: "r-123" }), {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        }),
    );

    const client = new SegmentationClient({
      apiKey: "bad_key",
      fetch: fetchMock,
    });

    await expect(
      client.segment({ prompts: ["painting"], inputS3Key: "inputs/demo.png" }),
    ).rejects.toBeInstanceOf(SegmentationApiError);

    await expect(
      client.segment({ prompts: ["painting"], inputS3Key: "inputs/demo.png" }),
    ).rejects.toMatchObject({
      status: 401,
      requestId: "r-123",
    });
  });

  it("extracts requestId from requestId error field", async () => {
    const fetchMock = asFetchMock(
      async () =>
        new Response(JSON.stringify({ message: "invalid key", requestId: "r-124" }), {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        }),
    );

    const client = new SegmentationClient({
      apiKey: "bad_key",
      fetch: fetchMock,
    });

    await expect(
      client.segment({ prompts: ["painting"], inputS3Key: "inputs/demo.png" }),
    ).rejects.toMatchObject({
      status: 401,
      requestId: "r-124",
    });
  });

  it("throws UploadError on upload failure", async () => {
    const fetchMock = asFetchMock(async () => new Response("forbidden", { status: 403 }));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.uploadImage({
        uploadUrl: "https://upload.example.com/a",
        data: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(UploadError);
  });

  it("fails fast on invalid uploadImage input", async () => {
    const fetchMock = asFetchMock(async () => new Response(null, { status: 200 }));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.uploadImage({
        uploadUrl: "not-a-url",
        data: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "uploadImage",
    });

    await expect(
      client.uploadImage({
        uploadUrl: "https://upload.example.com/a",
        data: "invalid" as unknown as Uint8Array,
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "uploadImage",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles Blob and Uint8Array uploads", async () => {
    const fetchMock = asFetchMock(async () => new Response(null, { status: 200 }));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await client.uploadImage({
      uploadUrl: "https://upload.example.com/blob",
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    });

    await client.uploadImage({
      uploadUrl: "https://upload.example.com/bytes",
      data: new Uint8Array([4, 5, 6]),
      contentType: "image/jpeg",
    });

    const firstHeaders = getHeaders(fetchMock.mock.calls[0]?.[1]);
    const secondHeaders = getHeaders(fetchMock.mock.calls[1]?.[1]);
    expect(firstHeaders.get("content-type")).toBe("image/png");
    expect(secondHeaders.get("content-type")).toBe("image/jpeg");
  });

  it("throws NetworkError when fetch fails", async () => {
    const fetchMock = asFetchMock(async () => {
      throw new TypeError("network down");
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(client.createPresignedUpload({ contentType: "image/png" })).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("fails fast on invalid segment input", async () => {
    const fetchMock = asFetchMock(async () => jsonResponse({}));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.segment({
        prompts: ["   "],
        inputS3Key: "inputs/demo.png",
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segment",
    });

    await expect(
      client.segment({
        prompts: [] as string[],
        inputS3Key: "inputs/demo.png",
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segment",
    });

    await expect(
      client.segment({
        prompts: ["painting"],
        inputS3Key: "inputs/demo.png",
        threshold: Number.NaN,
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segment",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails fast on invalid segmentVideo input combinations", async () => {
    const fetchMock = asFetchMock(async () => jsonResponse({}));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.segmentVideo({
        file: new Uint8Array([1]),
        points: [[1, 2]],
        boxes: [[1, 2, 3, 4]],
      } as never),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segmentVideo",
    });

    await expect(
      client.segmentVideo({
        file: new Uint8Array([1]),
        points: [[1, 2]],
        fps: 1,
        numFrames: 5,
      } as never),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segmentVideo",
    });

    await expect(
      client.segmentVideo({
        file: new Uint8Array([1]),
        points: [
          [1, 2],
          [3, 4],
        ],
        pointLabels: [1],
      } as never),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segmentVideo",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws ValidationError on malformed createPresignedUpload response", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        inputS3Key: "inputs/demo.png",
        bucket: "segmentation-assets-prod",
        expiresIn: 300,
      }),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(client.createPresignedUpload({ contentType: "image/png" })).rejects.toMatchObject({
      direction: "response",
      operation: "createPresignedUpload",
    });
  });

  it("throws ValidationError on malformed segment response", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        requestId: "request-4",
        jobId: "job-4",
        numInstances: 1,
        outputPrefix: "outputs/job-4/",
        masks: [{ key: "outputs/job-4/mask_0.png", score: 0.9, box: "bad" }],
      }),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.segment({ prompts: ["painting"], inputS3Key: "inputs/demo.png" }),
    ).rejects.toMatchObject({
      direction: "response",
      operation: "segment",
    });
  });

  it("orchestrates uploadAndSegment in the correct order", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);

      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/put",
          inputS3Key: "inputs/flow.png",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/segment")) {
        return jsonResponse({
          requestId: "request-3",
          jobId: "job-3",
          numInstances: 1,
          outputPrefix: "outputs/job-3/",
          masks: [
            {
              key: "outputs/job-3/mask_0.png",
              score: 0.9,
              box: [1, 2, 3, 4],
            },
          ],
        });
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.uploadAndSegment({
      prompts: ["painting"],
      data: new Uint8Array([7, 8, 9]),
      contentType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/uploads/presign");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://upload.example.com/put");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/segment");

    const segmentBody = JSON.parse(
      String((fetchMock.mock.calls[2]?.[1] as RequestInit)?.body),
    ) as Record<string, unknown>;
    expect(segmentBody.inputS3Key).toBe("inputs/flow.png");
    expect(result.jobId).toBe("job-3");
  });

  it("creates batch segment job and maps request fields", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse(
        {
          requestId: "batch-request-1",
          jobId: "batch-job-1",
          type: "image_batch",
          status: "queued",
          totalItems: 2,
          pollPath: "/v1/jobs/batch-job-1",
        },
        202,
      ),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.createBatchSegmentJob({
      prompts: ["cat"],
      threshold: 0.5,
      maskThreshold: 0.6,
      items: [{ inputS3Key: "inputs/a.png" }, { inputS3Key: "inputs/b.png" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/segment/batch");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.prompts).toEqual(["cat"]);
    expect(body.threshold).toBe(0.5);
    expect(body.maskThreshold).toBe(0.6);
    expect(body.items).toEqual([{ inputS3Key: "inputs/a.png" }, { inputS3Key: "inputs/b.png" }]);

    expect(result.requestId).toBe("batch-request-1");
    expect(result.jobId).toBe("batch-job-1");
    expect(result.totalItems).toBe(2);
    expect(result.pollPath).toBe("/v1/jobs/batch-job-1");
  });

  it("gets segment job status and normalizes item URLs", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        requestId: "batch-request-2",
        jobId: "batch-job-2",
        type: "image_batch",
        status: "processing",
        totalItems: 2,
        queuedItems: 0,
        processingItems: 1,
        successItems: 1,
        failedItems: 0,
        items: [
          {
            jobId: "task-0",
            inputS3Key: "inputs/a.png",
            status: "success",
            numInstances: 1,
            masks: [
              {
                key: "outputs/batch-job-2/item-0/mask_0.png",
                score: 0.9,
                box: [1, 2, 3, 4],
              },
            ],
          },
          {
            jobId: "task-1",
            inputS3Key: "inputs/b.png",
            status: "processing",
          },
        ],
      }),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.getSegmentJob({ jobId: "batch-job-2" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jobs/batch-job-2");
    expect(init.method).toBe("GET");
    expect(result.status).toBe("processing");
    expect(result.successItems).toBe(1);
    expect(result.type).toBe("image_batch");
    expect(result.items?.[0]?.masks?.[0]?.url).toBe(
      "https://assets.segmentationapi.com/outputs/batch-job-2/item-0/mask_0.png",
    );
    expect(result.items?.[1]?.masks).toBeUndefined();
  });

  it("sends bearer authorization header for getSegmentJob requests", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        requestId: "batch-request-2",
        jobId: "batch-job-2",
        type: "image_batch",
        status: "queued",
        totalItems: 1,
        queuedItems: 1,
        processingItems: 0,
        successItems: 0,
        failedItems: 0,
        items: [],
      }),
    );

    const client = new SegmentationClient({
      jwt: "jwt_get_token",
      fetch: fetchMock,
    });

    await client.getSegmentJob({ jobId: "batch-job-2" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jwt/jobs/batch-job-2");
    const headers = getHeaders(init);
    expect(headers.get("authorization")).toBe("Bearer jwt_get_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("fails fast on invalid batch input", async () => {
    const fetchMock = asFetchMock(async () => jsonResponse({}));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.createBatchSegmentJob({
        prompts: ["cat"],
        items: [],
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "createBatchSegmentJob",
    });

    await expect(
      client.getSegmentJob({
        jobId: "   ",
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "getSegmentJob",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
