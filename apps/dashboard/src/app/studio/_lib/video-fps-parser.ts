type Mp4BoxInfoTrack = {
  nb_samples?: number;
  duration?: number;
  timescale?: number;
  movie_duration?: number;
  movie_timescale?: number;
  fps?: number;
};

type Mp4BoxInfo = {
  videoTracks?: Mp4BoxInfoTrack[];
  tracks?: Mp4BoxInfoTrack[];
};

type Mp4BoxFile = {
  onError: ((error: string) => void) | null;
  onReady: ((info: Mp4BoxInfo) => void) | null;
  appendBuffer: (buffer: ArrayBuffer & { fileStart: number }) => number;
  flush: () => void;
};

function resolveTrackFps(track: Mp4BoxInfoTrack | undefined) {
  if (!track) {
    return null;
  }

  if (Number.isFinite(track.fps) && Number(track.fps) > 0) {
    return Number(track.fps);
  }

  if (
    Number.isFinite(track.nb_samples) &&
    Number.isFinite(track.movie_timescale) &&
    Number.isFinite(track.movie_duration) &&
    Number(track.nb_samples) > 0 &&
    Number(track.movie_timescale) > 0 &&
    Number(track.movie_duration) > 0
  ) {
    return (Number(track.nb_samples) * Number(track.movie_timescale)) / Number(track.movie_duration);
  }

  if (
    Number.isFinite(track.nb_samples) &&
    Number.isFinite(track.timescale) &&
    Number.isFinite(track.duration) &&
    Number(track.nb_samples) > 0 &&
    Number(track.timescale) > 0 &&
    Number(track.duration) > 0
  ) {
    return (Number(track.nb_samples) * Number(track.timescale)) / Number(track.duration);
  }

  return null;
}

function getVideoFpsFromInfo(info: Mp4BoxInfo) {
  const candidate = info.videoTracks?.[0] ?? info.tracks?.[0];
  const fps = resolveTrackFps(candidate);
  if (!fps || !Number.isFinite(fps) || fps < 1) {
    throw new Error("Unable to resolve FPS from video metadata.");
  }

  return fps;
}

export async function parseVideoSourceFps(file: File): Promise<number> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Only video files are supported.");
  }
  if (file.type !== "video/mp4") {
    throw new Error("Unsupported video format. Upload an MP4 video.");
  }

  const mp4boxModule = (await import("mp4box")) as { createFile?: () => Mp4BoxFile };
  if (typeof mp4boxModule.createFile !== "function") {
    throw new Error("Video parser is unavailable.");
  }

  const mp4boxFile = mp4boxModule.createFile();
  const buffer = (await file.arrayBuffer()) as ArrayBuffer & { fileStart: number };
  buffer.fileStart = 0;

  return new Promise<number>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Video metadata parsing timed out."));
    }, 10000);

    mp4boxFile.onError = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to parse MP4 metadata."));
    };

    mp4boxFile.onReady = (info) => {
      clearTimeout(timeout);
      try {
        resolve(getVideoFpsFromInfo(info));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Invalid video metadata."));
      }
    };

    try {
      mp4boxFile.appendBuffer(buffer);
      mp4boxFile.flush();
    } catch {
      clearTimeout(timeout);
      reject(new Error("Failed to read MP4 metadata."));
    }
  });
}
