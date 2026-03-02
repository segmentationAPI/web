import { describe, expect, it, vi } from "vitest";
import {
  buildMaskArtifactKey,
  buildMaskArtifactUrl,
  decodeCocoRleMask,
  loadVideoFrameMasks,
  normalizeMaskArtifacts,
  normalizeVideoFrameMasks,
} from "../src";

async function gzipText(content: string): Promise<Uint8Array> {
  const compressedStream = new Blob([content]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressedBuffer = await new Response(compressedStream).arrayBuffer();
  return new Uint8Array(compressedBuffer);
}

describe("mask artifact helpers", () => {
  it("builds canonical key from user/job/task and index", () => {
    const key = buildMaskArtifactKey(
      {
        userId: "/user-a/",
        jobId: "job-1",
        taskId: "/task-9",
      },
      2,
    );

    expect(key).toBe("outputs/user-a/job-1/task-9/mask_2.png");
  });

  it("builds public asset url from key", () => {
    const url = buildMaskArtifactUrl("/outputs/user-a/job-1/task-9/mask_2.png");
    expect(url).toBe("https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_2.png");
  });

  it("normalizes and sorts mask artifacts from object result", () => {
    const normalized = normalizeMaskArtifacts(
      {
        masks: [
          { maskIndex: 3, score: 0.7, box: [1, 2, 3, 4] },
          { mask_index: 1, confidence: 0.9, box: [5, 6, 7, 8] },
        ],
      },
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized).toEqual([
      {
        maskIndex: 1,
        key: "outputs/user-a/job-1/task-9/mask_1.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_1.png",
        score: 0.9,
        box: [5, 6, 7, 8],
      },
      {
        maskIndex: 3,
        key: "outputs/user-a/job-1/task-9/mask_3.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_3.png",
        score: 0.7,
        box: [1, 2, 3, 4],
      },
    ]);
  });

  it("handles non-array result", () => {
    const normalized = normalizeMaskArtifacts(
      { notMasks: [] },
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized).toEqual([]);
  });

  it("normalizes frame-indexed mask maps", () => {
    const normalized = normalizeVideoFrameMasks(
      [
        {
          frameIdx: 0,
          objects: [
            { objectId: 1, score: 0.91, box: [1, 2, 3, 4] },
            { objectId: 2, confidence: 0.8, box: [5, 6, 7, 8] },
          ],
        },
      ],
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized[0]).toEqual([
      {
        maskIndex: 1,
        key: "outputs/user-a/job-1/task-9/mask_1.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_1.png",
        score: 0.91,
        box: [1, 2, 3, 4],
      },
      {
        maskIndex: 2,
        key: "outputs/user-a/job-1/task-9/mask_2.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_2.png",
        score: 0.8,
        box: [5, 6, 7, 8],
      },
    ]);
  });

  it("normalizes ndjson text rows", () => {
    const normalized = normalizeVideoFrameMasks(
      [
        JSON.stringify({
          frameIdx: 0,
          objects: [{ objectId: 1, score: 1.0 }],
        }),
        JSON.stringify({
          frameIdx: 1,
          objects: [{ objectId: 1, confidence: 0.7 }],
        }),
      ].join("\n"),
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized[0]).toEqual([
      {
        maskIndex: 1,
        key: "outputs/user-a/job-1/task-9/mask_1.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_1.png",
        score: 1,
        box: null,
      },
    ]);
    expect(normalized[1]).toEqual([
      {
        maskIndex: 1,
        key: "outputs/user-a/job-1/task-9/mask_1.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_1.png",
        score: 0.7,
        box: null,
      },
    ]);
  });

  it("normalizes object with frames array", () => {
    const normalized = normalizeVideoFrameMasks(
      {
        frames: [
          {
            frameIdx: 4,
            objects: [{ objectId: 7, maskUrl: "https://assets.example.com/frame4-mask7.png" }],
          },
        ],
      },
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized[4]).toEqual([
      {
        maskIndex: 7,
        key: "outputs/user-a/job-1/task-9/mask_7.png",
        url: "https://assets.example.com/frame4-mask7.png",
        score: null,
        box: null,
      },
    ]);
  });

  it("returns empty map when no frame data exists", () => {
    const normalized = normalizeVideoFrameMasks(
      {
        masks: [{ maskIndex: 2, score: 0.5 }],
      },
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
    );

    expect(normalized).toEqual({});
  });

  it("loads and normalizes frame masks using computed frames.ndjson.gz url", async () => {
    const ndjson = [
      JSON.stringify({
        frameIdx: 0,
        objects: [
          {
            objectId: 2,
            score: 0.9,
            box: [1, 2, 3, 4],
            rle: {
              size: [2, 2],
              counts: [1, 2, 1],
            },
          },
        ],
      }),
    ].join("\n");

    const compressed = await gzipText(ndjson);
    const mockFetch = vi.fn(async () => {
      return new Response(compressed, {
        status: 200,
        headers: {
          "content-type": "application/gzip",
        },
      });
    });

    const normalized = await loadVideoFrameMasks(
      {},
      {
        userId: "user-a",
        jobId: "job-1",
        taskId: "task-9",
      },
      { fetch: mockFetch },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/frames.ndjson.gz",
      {
        method: "GET",
        signal: undefined,
      },
    );
    expect(normalized[0]).toEqual([
      {
        maskIndex: 2,
        key: "outputs/user-a/job-1/task-9/mask_2.png",
        url: "https://assets.segmentationapi.com/outputs/user-a/job-1/task-9/mask_2.png",
        score: 0.9,
        box: [1, 2, 3, 4],
        rle: {
          size: [2, 2],
          counts: [1, 2, 1],
        },
      },
    ]);
  });

  it("decodes COCO RLE masks into row-major binary data", () => {
    const decoded = decodeCocoRleMask({
      size: [2, 2],
      counts: [1, 2, 1],
    });

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(Array.from(decoded.data)).toEqual([0, 1, 1, 0]);
  });
});
