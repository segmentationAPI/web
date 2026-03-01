import type { MaskArtifactContext, MaskArtifactResult } from "./types";

const ASSETS_BASE_URL = "https://assets.segmentationapi.com";

function toNumberOrNull(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function toBoxOrNull(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length < 4) {
    return null;
  }

  const points = value.slice(0, 4).map((entry) => Number(entry));
  if (points.some((entry) => !Number.isFinite(entry))) {
    return null;
  }

  return points as [number, number, number, number];
}

export function buildMaskArtifactKey(
  context: MaskArtifactContext,
  maskIndex: number,
): string {
  const account = context.userId.trim().replace(/^\/+|\/+$/g, "");
  const job = context.jobId.trim().replace(/^\/+|\/+$/g, "");
  const task = context.taskId.trim().replace(/^\/+|\/+$/g, "");
  return `outputs/${account}/${job}/${task}/mask_${maskIndex}.png`;
}

export function buildMaskArtifactUrl(key: string): string {
  return `${ASSETS_BASE_URL}/${key.replace(/^\/+/, "")}`;
}

export function normalizeMaskArtifacts(
  result: unknown,
  context: MaskArtifactContext,
): MaskArtifactResult[] {
  const maskItems = Array.isArray(result)
    ? result
    : result && typeof result === "object" && Array.isArray((result as { masks?: unknown[] }).masks)
      ? ((result as { masks: unknown[] }).masks)
      : [];

  return maskItems
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => {
      const parsedMaskIndex = Number(entry.maskIndex ?? entry.mask_index ?? index);
      const maskIndex = Number.isFinite(parsedMaskIndex) ? parsedMaskIndex : index;
      const key = buildMaskArtifactKey(context, maskIndex);

      return {
        maskIndex,
        key,
        url: buildMaskArtifactUrl(key),
        score: toNumberOrNull(entry.score ?? entry.confidence),
        box: toBoxOrNull(entry.box),
      };
    })
    .sort((a, b) => a.maskIndex - b.maskIndex);
}
