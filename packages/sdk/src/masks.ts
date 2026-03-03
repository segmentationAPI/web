import type {
  CocoRle,
  FetchFunction,
  LoadVideoMaskTimelineOptions,
  MaskArtifactContext,
  MaskArtifactResult,
  VideoMaskTimeline,
  VideoMaskTimelineFrame,
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

type NdjsonFrameObject = {
  objectId?: unknown;
  box?: unknown;
  score?: unknown;
  rle?: unknown;
};

type NdjsonFrameRecord = {
  sampleIdx?: unknown;
  timeSec?: unknown;
  frameIdx?: unknown;
  objects?: unknown;
};

function toMaskArtifactFromFrameObject(
  frameObject: NdjsonFrameObject,
  context: MaskArtifactContext,
): MaskArtifactResult {
  const parsedObjectId = Number(frameObject.objectId);
  if (!Number.isInteger(parsedObjectId) || parsedObjectId < 0) {
    throw new Error("Invalid timeline object: `objectId` must be a non-negative integer.");
  }
  const maskIndex = parsedObjectId;
  const key = buildMaskArtifactKey(context, maskIndex);

  const rle = toCocoRleOrNull(frameObject.rle);
  if (!rle) {
    throw new Error("Invalid timeline object: `rle` is required and must be a valid COCO RLE.");
  }

  return {
    maskIndex,
    key,
    url: buildMaskArtifactUrl(key),
    score: toNumberOrNull(frameObject.score),
    box: toBoxOrNull(frameObject.box),
    rle,
  };
}

function toNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid timeline frame: \`${fieldName}\` must be a non-negative integer.`);
  }
  return value;
}

function toFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid timeline frame: \`${fieldName}\` must be a finite number.`);
  }
  return value;
}

function parseFramesFromNdjson(content: string): NdjsonFrameRecord[] {
  const records: NdjsonFrameRecord[] = [];
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error("Invalid timeline NDJSON: contains malformed JSON row.");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid timeline NDJSON: each row must be an object.");
    }

    records.push(parsed as NdjsonFrameRecord);
  }

  return records;
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

function parseFrames(result: unknown): NdjsonFrameRecord[] {
  if (typeof result === "string") {
    return parseFramesFromNdjson(result);
  }
  if (Array.isArray(result)) {
    if (result.some((entry) => !entry || typeof entry !== "object")) {
      throw new Error("Invalid timeline payload: `frames` entries must be objects.");
    }
    return result as NdjsonFrameRecord[];
  }
  if (result && typeof result === "object") {
    const root = result as Record<string, unknown>;
    if (!Array.isArray(root.frames)) {
      throw new Error("Invalid timeline payload: expected `frames` array.");
    }
    if (root.frames.some((entry) => !entry || typeof entry !== "object")) {
      throw new Error("Invalid timeline payload: `frames` entries must be objects.");
    }
    return root.frames as NdjsonFrameRecord[];
  }

  throw new Error("Invalid timeline payload: expected NDJSON text or object with `frames`.");
}

export function normalizeVideoMaskTimeline(
  result: unknown,
  context: MaskArtifactContext,
): VideoMaskTimeline {
  const parsedFrames = parseFrames(result);

  const timelineFrames: VideoMaskTimelineFrame[] = parsedFrames.map((frameRecord) => {
    if (!Array.isArray(frameRecord.objects)) {
      throw new Error("Invalid timeline frame: `objects` must be an array.");
    }

    if (frameRecord.objects.some((entry) => !entry || typeof entry !== "object")) {
      throw new Error("Invalid timeline frame: `objects` entries must be objects.");
    }

    const sampleIdx = toNonNegativeInteger(frameRecord.sampleIdx, "sampleIdx");
    const timeSec = toFiniteNumber(frameRecord.timeSec, "timeSec");
    if (timeSec < 0) {
      throw new Error("Invalid timeline frame: `timeSec` must be >= 0.");
    }

    const frameIdx =
      frameRecord.frameIdx === undefined
        ? undefined
        : toNonNegativeInteger(frameRecord.frameIdx, "frameIdx");
    const masks = frameRecord.objects
      .map((objectEntry) => toMaskArtifactFromFrameObject(objectEntry as NdjsonFrameObject, context))
      .sort((a, b) => a.maskIndex - b.maskIndex);

    return frameIdx === undefined
      ? { sampleIdx, timeSec, masks }
      : { sampleIdx, timeSec, masks, frameIdx };
  });

  timelineFrames.sort((left, right) => left.sampleIdx - right.sampleIdx);
  for (let idx = 1; idx < timelineFrames.length; idx += 1) {
    if (timelineFrames[idx]!.sampleIdx === timelineFrames[idx - 1]!.sampleIdx) {
      throw new Error("Invalid timeline payload: duplicate `sampleIdx` values.");
    }
  }

  return { frames: timelineFrames };
}

function getFetchImplementation(fetchImpl?: FetchFunction): FetchFunction {
  if (fetchImpl) {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("No fetch implementation found. Provide one in loadVideoMaskTimeline options.");
}

function isLikelyHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveVideoMaskTimelineUrl(result: unknown): string | null {
  if (typeof result === "string") {
    const value = result.trim();
    return isLikelyHttpUrl(value) ? value : null;
  }

  if (!result || typeof result !== "object") {
    return null;
  }

  const typedResult = result as Record<string, unknown>;
  if (typeof typedResult.output === "string") {
    return typedResult.output.trim();
  }

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

  return null;
}

async function decompressGzipText(content: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Gzip decompression is not available in this runtime.");
  }

  const stream = new Blob([content]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function readNdjsonPayload(response: Response): Promise<string> {
  const binaryResponse = response.clone();
  try {
    const buffer = await binaryResponse.arrayBuffer();
    return await decompressGzipText(buffer);
  } catch {
    return response.text();
  }
}

export async function loadVideoMaskTimeline(
  result: unknown,
  context: MaskArtifactContext,
  options?: LoadVideoMaskTimelineOptions,
): Promise<VideoMaskTimeline> {
  const framesUrl = resolveVideoMaskTimelineUrl(result);
  if (!framesUrl) {
    return { frames: [] };
  }

  try {
    const fetchImpl = getFetchImplementation(options?.fetch);
    const response = await fetchImpl(framesUrl, {
      method: "GET",
      signal: options?.signal,
    });

    if (!response.ok) {
      return { frames: [] };
    }

    const ndjsonPayload = await readNdjsonPayload(response);
    return normalizeVideoMaskTimeline(ndjsonPayload, context);
  } catch {
    return { frames: [] };
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

    if (counts.length > 2) {
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
