import Image from "next/image";

type MediaViewerProps = {
  assetUrl: string;
  mediaType: "image" | "video";
};

export default function MediaViewer({ assetUrl, mediaType }: MediaViewerProps) {
  return mediaType === "image" ? (
    <Image
      src={assetUrl}
      alt=""
      width={1200}
      height={1200}
      className="max-h-full w-full rounded-lg object-contain"
    />
  ) : (
    <video src={assetUrl} controls className="max-h-full w-full rounded-lg" />
  );
}
