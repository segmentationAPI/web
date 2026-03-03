"use client";

import { useEffect, useMemo } from "react";

type FilePreviewUrls = {
  imagePreviewUrls: string[];
  videoPreviewUrl: string | null;
};

export function useFilePreviewUrls(
  imageFiles: readonly File[],
  firstVideoFile: File | null,
): FilePreviewUrls {
  const imagePreviewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

  const videoPreviewUrl = useMemo(() => {
    if (!firstVideoFile) {
      return null;
    }

    return URL.createObjectURL(firstVideoFile);
  }, [firstVideoFile]);

  useEffect(() => {
    return () => {
      for (const url of imagePreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    if (!videoPreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  return {
    imagePreviewUrls,
    videoPreviewUrl,
  };
}
