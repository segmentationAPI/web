import type { JobStatusResult } from "./types";

const ASSETS_BASE_URL = "https://assets.segmentationapi.com";

function trimSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

export function buildOutputManifestKey(
  userId: string,
  jobId: string,
  outputFolder?: string,
): string {
  const account = trimSegment(userId);
  const job = trimSegment(jobId);
  const explicitOutputFolder = outputFolder ? trimSegment(outputFolder) : "";
  const baseKey = explicitOutputFolder.length > 0
    ? `outputs/${account}/${explicitOutputFolder}`
    : `outputs/${account}/${job}`;
  return `${baseKey}/output_manifest.json`;
}

export function buildOutputManifestUrl(
  userId: string,
  jobId: string,
  outputFolder?: string,
): string {
  return `${ASSETS_BASE_URL}/${buildOutputManifestKey(userId, jobId, outputFolder)}`;
}

export function resolveOutputFolder(status: JobStatusResult): string | undefined {
  const outputFolder = status.raw.outputFolder;
  return typeof outputFolder === "string" && outputFolder.trim().length > 0
    ? outputFolder
    : undefined;
}

export type OutputManifest = {
  result?: unknown;
  items?: Record<string, { result?: unknown } | undefined>;
};

export function resolveManifestResultForTask(
  manifest: unknown,
  taskId: string,
): unknown {
  if (!manifest || typeof manifest !== "object") {
    return undefined;
  }

  const root = manifest as OutputManifest;

  if (root.items && typeof root.items === "object") {
    const entry = root.items[taskId];
    if (entry && typeof entry === "object" && "result" in entry) {
      return entry.result;
    }
  }

  return root.result;
}
