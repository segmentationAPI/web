import { useEffect, useState } from "react";

export function useVideoFrame(file: File | null): string | null {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFrameUrl(null);
      return;
    }

    let cancelled = false;
    let revoked = false;
    const objectUrl = URL.createObjectURL(file);

    function revokeUrl() {
      if (!revoked) {
        URL.revokeObjectURL(objectUrl);
        revoked = true;
      }
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      if (!cancelled) video.currentTime = 0.001;
    };

    video.onseeked = () => {
      if (cancelled) {
        revokeUrl();
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setFrameUrl(canvas.toDataURL("image/png"));
      }
      revokeUrl();
    };

    video.onerror = () => revokeUrl();
    video.src = objectUrl;

    return () => {
      cancelled = true;
      revokeUrl();
    };
  }, [file]);

  return frameUrl;
}
