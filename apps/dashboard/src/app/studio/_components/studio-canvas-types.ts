export type BoxCoordinates = [number, number, number, number];

export type CanvasMask = {
  key: string;
  url: string;
  score?: number | null;
  box?: BoxCoordinates | null;
};
