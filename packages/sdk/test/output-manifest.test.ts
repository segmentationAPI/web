import { describe, expect, it } from "vitest";
import {
  buildOutputManifestKey,
  buildOutputManifestUrl,
  resolveManifestResultForTask,
  resolveOutputFolder,
  type JobStatusResult,
} from "../src";

function createJobStatusResult(raw: { outputFolder?: string }): JobStatusResult {
  return {
    requestId: "req-1",
    jobId: "job-1",
    type: "image_batch",
    status: "queued",
    totalItems: 1,
    queuedItems: 1,
    processingItems: 0,
    successItems: 0,
    failedItems: 0,
    raw: {
      requestId: "req-1",
      jobId: "job-1",
      type: "image_batch",
      status: "queued",
      totalItems: 1,
      queuedItems: 1,
      processingItems: 0,
      successItems: 0,
      failedItems: 0,
      ...raw,
    },
  };
}

describe("output manifest helpers", () => {
  it("builds manifest key using job id when output folder is not provided", () => {
    const key = buildOutputManifestKey("/user-a/", "job-1");
    expect(key).toBe("outputs/user-a/job-1/output_manifest.json");
  });

  it("builds manifest key using explicit output folder", () => {
    const key = buildOutputManifestKey("user-a", "job-1", "/custom/folder/");
    expect(key).toBe("outputs/user-a/custom/folder/output_manifest.json");
  });

  it("builds manifest url from canonical key", () => {
    const url = buildOutputManifestUrl("user-a", "job-1", "custom/folder");
    expect(url).toBe("https://assets.segmentationapi.com/outputs/user-a/custom/folder/output_manifest.json");
  });

  it("resolves output folder from job status raw payload", () => {
    const outputFolder = resolveOutputFolder(createJobStatusResult({ outputFolder: "folder-a" }));
    expect(outputFolder).toBe("folder-a");
  });

  it("returns undefined for empty output folder", () => {
    const outputFolder = resolveOutputFolder(createJobStatusResult({ outputFolder: "  " }));
    expect(outputFolder).toBeUndefined();
  });

  it("resolves task result from manifest item when available", () => {
    const result = resolveManifestResultForTask(
      {
        result: { fallback: true },
        items: {
          "task-1": { result: { masks: [1] } },
        },
      },
      "task-1",
    );

    expect(result).toEqual({ masks: [1] });
  });

  it("falls back to root result when task entry is missing", () => {
    const result = resolveManifestResultForTask(
      {
        result: { masks: [2] },
        items: {},
      },
      "task-2",
    );

    expect(result).toEqual({ masks: [2] });
  });

  it("returns undefined for non-object manifest", () => {
    const result = resolveManifestResultForTask(null, "task-1");
    expect(result).toBeUndefined();
  });
});
