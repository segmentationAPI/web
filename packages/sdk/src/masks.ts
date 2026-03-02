import type {
  CocoRle,
  FetchFunction,
  LoadVideoFrameMasksOptions,
  MaskArtifactContext,
  MaskArtifactResult,
  VideoFrameMaskMap,
} from "./types";

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

function toCocoRleOrNull(value: unknown): CocoRle | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const typed = value as Record<string, unknown>;
  if (!Array.isArray(typed.size) || typed.size.length < 2) {
    return null;
  }

  const height = Number(typed.size[0]);
  const width = Number(typed.size[1]);
  if (!Number.isFinite(height) || !Number.isFinite(width) || height <= 0 || width <= 0) {
    return null;
  }

  const countsRaw = typed.counts;
  if (typeof countsRaw === "string") {
    const counts = countsRaw.trim();
    if (counts.length === 0) {
      return null;
    }

    return {
      size: [Math.floor(height), Math.floor(width)],
      counts,
    };
  }

  if (Array.isArray(countsRaw) && countsRaw.every((entry) => Number.isFinite(Number(entry)))) {
    return {
      size: [Math.floor(height), Math.floor(width)],
      counts: countsRaw.map((entry) => Number(entry)),
    };
  }

  return null;
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
  rle?: unknown;
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

  const rle = toCocoRleOrNull(frameObject.rle);

  return {
    maskIndex,
    key,
    url,
    score: toNumberOrNull(frameObject.score ?? frameObject.confidence),
    box: toBoxOrNull(frameObject.box),
    ...(rle ? { rle } : {}),
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

function getFetchImplementation(fetchImpl?: FetchFunction): FetchFunction {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("No fetch implementation found. Provide one in loadVideoFrameMasks options.");
}

function isLikelyHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveVideoFrameMasksUrl(result: unknown): string | null {
  if (typeof result === "string") {
    const value = result.trim();
    return isLikelyHttpUrl(value) ? value : null;
  }

  if (!result || typeof result !== "object") {
    return null;
  }

  const typedResult = result as Record<string, unknown>;

  if (typeof typedResult.framesNdjsonUrl === "string") {
    return typedResult.framesNdjsonUrl.trim();
  }
  if (typeof typedResult.frames_ndjson_url === "string") {
    return typedResult.frames_ndjson_url.trim();
  }
  if (typeof typedResult.framesUrl === "string") {
    return typedResult.framesUrl.trim();
  }
  if (typeof typedResult.frames_url === "string") {
    return typedResult.frames_url.trim();
  }

  const rawOutput = typedResult.output;
  if (typeof rawOutput === "string") {
    const value = rawOutput.trim();
    return isLikelyHttpUrl(value) ? value : null;
  }

  if (!rawOutput || typeof rawOutput !== "object") {
    return null;
  }

  const output = rawOutput as Record<string, unknown>;
  const outputUrl =
    typeof output.framesNdjsonUrl === "string"
      ? output.framesNdjsonUrl
      : typeof output.frames_ndjson_url === "string"
        ? output.frames_ndjson_url
        : typeof output.framesUrl === "string"
          ? output.framesUrl
          : typeof output.frames_url === "string"
            ? output.frames_url
            : typeof output.url === "string"
              ? output.url
              : null;

  return outputUrl?.trim() ?? null;
}

async function decompressGzipText(content: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Gzip decompression is not available in this runtime.");
  }

  const stream = new Blob([content]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function readNdjsonPayload(response: Response, sourceUrl: string): Promise<string> {
  const contentEncoding = response.headers.get("content-encoding")?.toLowerCase() ?? "";
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const looksGzip =
    contentEncoding.includes("gzip") ||
    contentType.includes("application/gzip") ||
    contentType.includes("application/x-gzip") ||
    sourceUrl.toLowerCase().endsWith(".gz");

  if (looksGzip) {
    const buffer = await response.arrayBuffer();
    return decompressGzipText(buffer);
  }

  return response.text();
}

export async function loadVideoFrameMasks(
  result: unknown,
  context: MaskArtifactContext,
  options?: LoadVideoFrameMasksOptions,
): Promise<VideoFrameMaskMap> {
  const inlineMasks = normalizeVideoFrameMasks(result, context);
  if (Object.keys(inlineMasks).length > 0) {
    return inlineMasks;
  }

  const framesUrl = resolveVideoFrameMasksUrl(result);
  if (!framesUrl) {
    return {};
  }

  try {
    const fetchImpl = getFetchImplementation(options?.fetch);
    const response = await fetchImpl(framesUrl, {
      method: "GET",
      signal: options?.signal,
    });

    if (!response.ok) {
      return {};
    }

    const ndjsonPayload = await readNdjsonPayload(response, framesUrl);
    return normalizeVideoFrameMasks(ndjsonPayload, context);
  } catch {
    return {};
  }
}

function decodeCompressedCocoCounts(encodedCounts: string): number[] {
  const counts: number[] = [];
  let index = 0;

  while (index < encodedCounts.length) {
    let value = 0;
    let shift = 0;
    let current = 0;

    while (true) {
      current = encodedCounts.charCodeAt(index) - 48;
      index += 1;

      value |= (current & 0x1f) << (5 * shift);
      shift += 1;

      if ((current & 0x20) === 0) {
        break;
      }
    }

    if ((current & 0x10) !== 0) {
      value |= -1 << (5 * shift);
    }

    if (counts.length > 1) {
      value += counts[counts.length - 2]!;
    }

    counts.push(Math.max(0, value));
  }

  return counts;
}

export function decodeCocoRleMask(rle: CocoRle): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const height = Math.max(1, Math.floor(rle.size[0]));
  const width = Math.max(1, Math.floor(rle.size[1]));
  const totalPixels = width * height;
  const decoded = new Uint8Array(totalPixels);

  const counts =
    typeof rle.counts === "string"
      ? decodeCompressedCocoCounts(rle.counts)
      : rle.counts.map((value) => Math.max(0, Math.floor(value)));

  let index = 0;
  let isMaskRun = false;

  for (const runLength of counts) {
    if (runLength <= 0) {
      isMaskRun = !isMaskRun;
      continue;
    }

    if (isMaskRun) {
      const upperBound = Math.min(index + runLength, totalPixels);
      for (let flatIndex = index; flatIndex < upperBound; flatIndex += 1) {
        const row = flatIndex % height;
        const column = Math.floor(flatIndex / height);
        decoded[row * width + column] = 1;
      }
    }

    index += runLength;
    if (index >= totalPixels) {
      break;
    }

    isMaskRun = !isMaskRun;
  }

  return { width, height, data: decoded };
}
