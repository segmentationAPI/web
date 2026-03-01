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
        taskId: "task-demo",
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
    expect(result.taskId).toBe("task-demo");
  });

  it("sends bearer authorization header when jwt is provided", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse({
        uploadUrl: "https://upload.example.com/a",
        taskId: "task-demo",
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

  it("uploads video through presign before sending segmentVideo request to /jobs", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);
      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/video-put",
          taskId: "video-task-1",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/video-put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/jobs")) {
        return jsonResponse({
          requestId: "video-request-1",
          jobId: "video-job-1",
          type: "video",
          status: "queued",
          totalItems: 1,
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
        { coordinates: [10, 20], isPositive: true, objectId: 101 },
        { coordinates: [30, 40], isPositive: false, objectId: 101 },
      ],
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
    expect(segmentUrl).toBe("https://api.segmentationapi.com/v1/jobs");
    expect(getHeaders(segmentInit).get("x-api-key")).toBe("test_key");
    expect(getHeaders(segmentInit).get("content-type")).toBe("application/json");
    const body = JSON.parse(String(segmentInit.body)) as Record<string, unknown>;
    expect(body.type).toBe("video");
    expect((body.items as Array<{ taskId: string }>)[0].taskId).toBe("video-task-1");
    expect(body.fps).toBe(2.5);
    expect(body.maxFrames).toBe(80);
    expect(body.frameIdx).toBe(5);
    expect(body.points).toBeDefined();

    expect(result.requestId).toBe("video-request-1");
    expect(result.jobId).toBe("video-job-1");
    expect(result.type).toBe("video");
    expect(result.status).toBe("queued");
  });

  it("sends bearer authorization header for segmentVideo requests with jwt", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);
      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/video-put-jwt",
          taskId: "video-task-jwt",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/video-put-jwt") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/jobs")) {
        return jsonResponse({
          requestId: "video-request-jwt",
          jobId: "video-job-jwt",
          type: "video",
          status: "queued",
          totalItems: 1,
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
      boxes: [{ coordinates: [1, 2, 3, 4], isPositive: true, objectId: 1 }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [presignUrl, presignInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(presignUrl).toBe("https://api.segmentationapi.com/v1/jwt/uploads/presign");
    expect(getHeaders(presignInit).get("authorization")).toBe("Bearer jwt_video_token");

    const [segmentUrl, segmentInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(segmentUrl).toBe("https://api.segmentationapi.com/v1/jwt/jobs");
    const headers = getHeaders(segmentInit);
    expect(headers.get("authorization")).toBe("Bearer jwt_video_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("sends bearer authorization header for createJob requests with jwt", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse(
        {
          requestId: "batch-jwt-1",
          jobId: "batch-job-jwt",
          type: "image_batch",
          status: "queued",
          totalItems: 1,
        },
        202,
      ),
    );

    const client = new SegmentationClient({
      jwt: "jwt_batch_token",
      fetch: fetchMock,
    });

    await client.createJob({
      type: "image_batch",
      prompts: ["cat"],
      items: [{ taskId: "task-a" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jwt/jobs");
    const headers = getHeaders(init);
    expect(headers.get("authorization")).toBe("Bearer jwt_batch_token");
    expect(headers.get("x-api-key")).toBeNull();
  });

  it("orchestrates uploadAndCreateJob: presign → upload → createJob", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);

      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/put",
          taskId: "task-flow",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/jobs")) {
        return jsonResponse(
          {
            requestId: "request-3",
            jobId: "job-3",
            type: "image_batch",
            status: "queued",
            totalItems: 1,
          },
          202,
        );
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.uploadAndCreateJob({
      type: "image_batch",
      prompts: ["painting"],
      files: [{ data: new Uint8Array([7, 8, 9]), contentType: "image/png" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/uploads/presign");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://upload.example.com/put");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/jobs");

    const jobBody = JSON.parse(
      String((fetchMock.mock.calls[2]?.[1] as RequestInit)?.body),
    ) as Record<string, unknown>;
    expect(jobBody.type).toBe("image_batch");
    expect(jobBody.prompts).toEqual(["painting"]);
    expect((jobBody.items as Array<{ taskId: string }>)[0].taskId).toBe("task-flow");
    expect(result.jobId).toBe("job-3");
  });

  it("sends boxes without prompts in uploadAndCreateJob", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);

      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/put-boxes",
          taskId: "task-flow-boxes",
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/put-boxes") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/jobs")) {
        return jsonResponse(
          {
            requestId: "request-boxes",
            jobId: "job-boxes",
            type: "image_batch",
            status: "queued",
            totalItems: 1,
          },
          202,
        );
      }

      return new Response("unexpected call", { status: 500 });
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await client.uploadAndCreateJob({
      type: "image_batch",
      boxes: [{ coordinates: [10, 20, 30, 40], isPositive: true }],
      files: [{ data: new Uint8Array([7, 8, 9]), contentType: "image/png" }],
    });

    const jobBody = JSON.parse(
      String((fetchMock.mock.calls[2]?.[1] as RequestInit)?.body),
    ) as Record<string, unknown>;
    expect(jobBody.prompts).toBeUndefined();
    expect(jobBody.boxes).toEqual([{ coordinates: [10, 20, 30, 40], isPositive: true }]);
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

  it("creates job and maps request fields", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse(
        {
          requestId: "batch-request-1",
          jobId: "batch-job-1",
          type: "image_batch",
          status: "queued",
          totalItems: 2,
        },
        202,
      ),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const result = await client.createJob({
      type: "image_batch",
      prompts: ["cat"],
      threshold: 0.5,
      maskThreshold: 0.6,
      items: [{ taskId: "task-a" }, { taskId: "task-b" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.segmentationapi.com/v1/jobs");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.type).toBe("image_batch");
    expect(body.prompts).toEqual(["cat"]);
    expect(body.threshold).toBe(0.5);
    expect(body.maskThreshold).toBe(0.6);
    expect(body.items).toEqual([{ taskId: "task-a" }, { taskId: "task-b" }]);

    expect(result.requestId).toBe("batch-request-1");
    expect(result.jobId).toBe("batch-job-1");
    expect(result.totalItems).toBe(2);
  });

  it("sends boxes without prompts in createJob", async () => {
    const fetchMock = asFetchMock(async () =>
      jsonResponse(
        {
          requestId: "batch-request-boxes",
          jobId: "batch-job-boxes",
          type: "image_batch",
          status: "queued",
          totalItems: 1,
        },
        202,
      ),
    );

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await client.createJob({
      type: "image_batch",
      boxes: [{ coordinates: [5, 10, 50, 100], isPositive: true }],
      items: [{ taskId: "task-a" }],
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body)) as Record<
      string,
      unknown
    >;
    expect(body.prompts).toBeUndefined();
    expect(body.boxes).toEqual([{ coordinates: [5, 10, 50, 100], isPositive: true }]);
    expect(body.items).toEqual([{ taskId: "task-a" }]);
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
      client.createJob({ type: "image_batch", items: [{ taskId: "task-demo" }] }),
    ).rejects.toBeInstanceOf(SegmentationApiError);

    await expect(
      client.createJob({ type: "image_batch", items: [{ taskId: "task-demo" }] }),
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
      client.createJob({ type: "image_batch", items: [{ taskId: "task-demo" }] }),
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

  it("fails fast on invalid segmentVideo input combinations", async () => {
    const fetchMock = asFetchMock(async () => jsonResponse({}));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.segmentVideo({
        file: new Uint8Array([1]),
        points: [{ coordinates: [1, 2], isPositive: true }],
        boxes: [{ coordinates: [1, 2, 3, 4], isPositive: true }],
      } as never),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "segmentVideo",
    });

    await expect(
      client.segmentVideo({
        file: new Uint8Array([1]),
        points: [{ coordinates: [1, 2], isPositive: true }],
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
        points: [{ coordinates: [1, 2], isPositive: true }],
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
        taskId: "task-demo",
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
            taskId: "task-abc12345",
            status: "success",
          },
          {
            taskId: "task-def67890",
            status: "running",
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
    expect(result.items?.[0]?.taskId).toBe("task-abc12345");
    expect(result.items?.[0]?.error).toBeUndefined();
    expect(result.items?.[1]?.error).toBeUndefined();
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

  it("fails fast on invalid createJob input", async () => {
    const fetchMock = asFetchMock(async () => jsonResponse({}));
    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    await expect(
      client.createJob({
        type: "image_batch",
        prompts: ["cat"],
        items: [],
      }),
    ).rejects.toMatchObject({
      direction: "input",
      operation: "createJob",
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

  it("invokes onProgress callback during uploadAndCreateJob", async () => {
    const fetchMock = asFetchMock(async (input) => {
      const url = String(input);

      if (url.endsWith("/uploads/presign")) {
        return jsonResponse({
          uploadUrl: "https://upload.example.com/put",
          taskId: `task-${Math.random()}`,
          bucket: "segmentation-assets-prod",
          expiresIn: 300,
        });
      }

      if (url === "https://upload.example.com/put") {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/jobs")) {
        return jsonResponse(
          {
            requestId: "progress-req",
            jobId: "progress-job",
            type: "image_batch",
            status: "queued",
            totalItems: 2,
          },
          202,
        );
      }

      return new Response("unexpected", { status: 500 });
    });

    const client = new SegmentationClient({
      apiKey: "test_key",
      fetch: fetchMock,
    });

    const progressCalls: Array<[number, number]> = [];
    await client.uploadAndCreateJob(
      {
        type: "image_batch",
        prompts: ["cat"],
        files: [
          { data: new Uint8Array([1]), contentType: "image/png" },
          { data: new Uint8Array([2]), contentType: "image/png" },
        ],
      },
      (done, total) => {
        progressCalls.push([done, total]);
      },
    );

    expect(progressCalls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
