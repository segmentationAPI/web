import { describe, expect, it } from "vitest";
import {
  buildMaskArtifactKey,
  buildMaskArtifactUrl,
  normalizeMaskArtifacts,
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
});
