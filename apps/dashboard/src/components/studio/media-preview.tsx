"use client";

import Image from "next/image";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MediaPreviewProps = {
  assetUrl: string;
  mediaType: "image" | "video";
  className?: string;
};

const mediaClassName =
  "h-auto max-h-full w-auto max-w-full rounded-lg object-contain transition-opacity duration-200";

export default function MediaPreview({ assetUrl, mediaType, className }: MediaPreviewProps) {
  return (
    <MediaPreviewContent
      key={`${mediaType}:${assetUrl}`}
      assetUrl={assetUrl}
      mediaType={mediaType}
      className={className}
    />
  );
}

function MediaPreviewContent({ assetUrl, mediaType, className }: MediaPreviewProps) {
  const [isReady, setIsReady] = useState(false);

  const handleReady = () => setIsReady(true);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
    >
      {!isReady ? <MediaPreviewSkeleton /> : null}
      <MediaAsset
        assetUrl={assetUrl}
        mediaType={mediaType}
        isReady={isReady}
        onReady={handleReady}
      />
    </div>
  );
}

function MediaPreviewSkeleton() {
  return (
    <div className="absolute inset-0 p-3 sm:p-4" aria-hidden>
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}

function MediaAsset({
  assetUrl,
  mediaType,
  isReady,
  onReady,
}: {
  assetUrl: string;
  mediaType: MediaPreviewProps["mediaType"];
  isReady: boolean;
  onReady: () => void;
}) {
  const className = cn(mediaClassName, isReady ? "opacity-100" : "opacity-0");

  if (mediaType === "image") {
    return (
      <Image
        src={assetUrl}
        alt=""
        width={1200}
        height={1200}
        className={className}
        onLoadingComplete={onReady}
        onError={onReady}
      />
    );
  }

  return (
    <video
      src={assetUrl}
      controls
      playsInline
      className={className}
      onLoadedData={onReady}
      onError={onReady}
    />
  );
}
