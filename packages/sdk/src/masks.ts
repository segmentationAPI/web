import type { MaskArtifactContext, MaskArtifactResult, VideoFrameMaskMap } from "./types";

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

function toFrameIndex(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.floor(value);
  if (rounded < 0) {
    return null;
  }

  return rounded;
}

type NdjsonFrameObject = {
  objectId?: unknown;
  box?: unknown;
  score?: unknown;
  confidence?: unknown;
  maskUrl?: unknown;
  mask_url?: unknown;
};

type NdjsonFrameRecord = {
  frameIdx?: unknown;
  objects?: unknown;
};

function toMaskArtifactFromFrameObject(
  frameObject: NdjsonFrameObject,
  context: MaskArtifactContext,
  fallbackIndex: number,
): MaskArtifactResult {
  const parsedObjectId = Number(frameObject.objectId);
  const maskIndex = Number.isFinite(parsedObjectId)
    ? Math.max(0, Math.floor(parsedObjectId))
    : fallbackIndex;
  const key = buildMaskArtifactKey(context, maskIndex);

  const rawUrl =
    typeof frameObject.maskUrl === "string"
      ? frameObject.maskUrl
      : typeof frameObject.mask_url === "string"
        ? frameObject.mask_url
        : "";
  const url = rawUrl.trim().length > 0 ? rawUrl : buildMaskArtifactUrl(key);

  return {
    maskIndex,
    key,
    url,
    score: toNumberOrNull(frameObject.score ?? frameObject.confidence),
    box: toBoxOrNull(frameObject.box),
  };
}

function parseFramesFromNdjson(content: string): NdjsonFrameRecord[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (!parsed || typeof parsed !== "object") {
          return [];
        }
        return [parsed as NdjsonFrameRecord];
      } catch {
        return [];
      }
    });
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

export function normalizeVideoFrameMasks(
  result: unknown,
  context: MaskArtifactContext,
): VideoFrameMaskMap {
  const frameMasks: VideoFrameMaskMap = {};

  let frames: NdjsonFrameRecord[] = [];
  if (typeof result === "string") {
    frames = parseFramesFromNdjson(result);
  } else if (Array.isArray(result)) {
    frames = result.filter((entry): entry is NdjsonFrameRecord => Boolean(entry) && typeof entry === "object");
  } else if (result && typeof result === "object") {
    const root = result as Record<string, unknown>;
    if (Array.isArray(root.frames)) {
      frames = root.frames.filter((entry): entry is NdjsonFrameRecord => Boolean(entry) && typeof entry === "object");
    }
  }

  for (const frameRecord of frames) {
    const frameIndex = toFrameIndex(frameRecord.frameIdx);
    if (frameIndex === null || !Array.isArray(frameRecord.objects)) {
      continue;
    }

    const masks = frameRecord.objects
      .filter((entry): entry is NdjsonFrameObject => Boolean(entry) && typeof entry === "object")
      .map((objectEntry, index) => toMaskArtifactFromFrameObject(objectEntry, context, index))
      .sort((a, b) => a.maskIndex - b.maskIndex);

    if (masks.length > 0) {
      frameMasks[frameIndex] = masks;
    }
  }

  if (Object.keys(frameMasks).length > 0) {
    return frameMasks;
  }

  return {};
}
