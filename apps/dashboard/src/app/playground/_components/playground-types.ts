export type PlaygroundResult = {
  masks: {
    base64: string;
    box2d: [number, number, number, number];
    label: string | null;
    score: number;
  }[];
};

export type PlaygroundErrorState = {
  details: string[];
  title: string;
};

export type PlaygroundStatus = "idle" | "uploading" | "ready" | "running";

export type RunButtonState = "default" | "queued" | "running";

