import { describe, expect, it } from "vitest";
import {
  buildMaskArtifactKey,
  buildMaskArtifactUrl,
  normalizeMaskArtifacts,
  normalizeVideoFrameMasks,
} from "../src";

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
});
