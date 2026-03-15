export type StudioRunStatus = "idle" | "queued" | "processing" | "completed" | "failed";

export type StudioSelectionResult = {
  addedCount: number;
  errors: string[];
};
