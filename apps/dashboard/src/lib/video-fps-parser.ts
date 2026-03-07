import { MP4BoxBuffer, createFile, type Movie } from "mp4box";

type Mp4BoxInfoTrack = {
  nb_samples?: number;
  duration?: number;
  timescale?: number;
  movie_duration?: number;
  movie_timescale?: number;
  fps?: number;
};

function getTrackFps(track?: Mp4BoxInfoTrack) {
  if (!track) return null;
  if (Number.isFinite(track.fps) && Number(track.fps) > 0) return Number(track.fps);
  if (track.nb_samples && track.movie_timescale && track.movie_duration) {
    return (track.nb_samples * track.movie_timescale) / track.movie_duration;
  }
  if (track.nb_samples && track.timescale && track.duration) {
    return (track.nb_samples * track.timescale) / track.duration;
  }
  return null;
}

export async function parseVideoSourceFps(file: File): Promise<number> {
  if (file.type !== "video/mp4") {
    throw new Error("Unsupported video format. Upload an MP4 video.");
  }

  const mp4boxFile = createFile();
  const buffer = MP4BoxBuffer.fromArrayBuffer(await file.arrayBuffer(), 0);

  return new Promise<number>((resolve, reject) => {
    mp4boxFile.onError = () => reject(new Error("Failed to parse MP4 metadata."));
    mp4boxFile.onReady = (info: Movie) => {
      const fps = getTrackFps(info.videoTracks?.[0] ?? info.tracks?.[0]);
      if (!fps || !Number.isFinite(fps) || fps < 1) {
        reject(new Error("Unable to resolve FPS from video metadata."));
        return;
      }
      resolve(fps);
    };

    try {
      mp4boxFile.appendBuffer(buffer);
      mp4boxFile.flush();
    } catch {
      reject(new Error("Failed to read MP4 metadata."));
    }
  });
}
