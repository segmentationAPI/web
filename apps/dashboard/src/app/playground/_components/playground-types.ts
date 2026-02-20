import { SegmentationClient } from "@segmentationapi/sdk";

export type PlaygroundResult = Awaited<ReturnType<SegmentationClient["segment"]>>;

export type PlaygroundErrorState = {
  details: string[];
  title: string;
};

export type PlaygroundStatus = "idle" | "uploading" | "ready" | "running";

export type RunButtonState = "default" | "queued" | "running";

