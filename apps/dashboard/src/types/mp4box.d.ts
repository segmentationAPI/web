declare module "mp4box" {
  export type Mp4BoxFile = {
    onError: ((error: string) => void) | null;
    onReady: ((info: unknown) => void) | null;
    appendBuffer: (buffer: ArrayBuffer & { fileStart: number }) => number;
    flush: () => void;
  };

  export function createFile(): Mp4BoxFile;
}
