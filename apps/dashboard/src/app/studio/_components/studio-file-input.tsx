"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

type StudioFileInputProps = {
  onFilesChange: (nextFiles: File[]) => void;
  resetKey?: number;
};

type InternalFileKind = "image" | "video" | "none";

function classifyFiles(files: File[]): InternalFileKind {
  if (files.length === 0) return "none";
  const firstIsVideo = files[0]!.type.startsWith("video/");
  return firstIsVideo ? "video" : "image";
}

function getAcceptedFiles(next: FileList | null): File[] {
  const accepted = Array.from(next ?? []).filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
  );

  if (accepted.length === 0) {
    return [];
  }

  if (accepted[0]!.type.startsWith("video/")) {
    const firstVideo = accepted.find((file) => file.type.startsWith("video/"));
    return firstVideo ? [firstVideo] : [];
  }

  return accepted.filter((file) => file.type.startsWith("image/"));
}

export function StudioFileInput({ onFilesChange, resetKey = 0 }: StudioFileInputProps) {
  const [files, setFiles] = useState<File[]>([]);
  const fileKind = useMemo(() => classifyFiles(files), [files]);

  const imagePreviewUrls = useMemo(
    () => files.filter((file) => file.type.startsWith("image/")).map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const previewUrl of imagePreviewUrls) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    setFiles([]);
    onFilesChange([]);
  }, [onFilesChange, resetKey]);

  function handleSelection(next: FileList | null) {
    const selectedFiles = getAcceptedFiles(next);
    setFiles(selectedFiles);
    onFilesChange(selectedFiles);
  }

  function removeFile(index: number) {
    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(nextFiles);
    onFilesChange(nextFiles);
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Assets</p>
      <Input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(event) => handleSelection(event.target.files)}
        className="h-10 cursor-pointer rounded-lg border-input bg-background/65 file:mr-2 file:rounded-md file:border file:border-input file:bg-muted/60 file:px-2.5"
      />

      {files.length > 0 ? (
        <div className="max-h-68 space-y-2 overflow-y-auto pr-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border border-border/55 bg-muted/20 px-2.5 py-2"
            >
              {fileKind === "image" ? (
                <Image
                  src={imagePreviewUrls[index]}
                  alt={file.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12 shrink-0 rounded-md border border-border/50 object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground">
                  <span className="font-mono text-[9px]">VID</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-foreground">{file.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {fileKind === "image" ? "image" : "video"} · {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-7 px-2 text-muted-foreground"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty className="rounded-lg border-border/55 bg-muted/10 px-3 py-4">
          <EmptyHeader>
            <EmptyTitle className="text-xs">No assets selected</EmptyTitle>
            <EmptyDescription className="text-xs">
              Drop or select images/video to start a segmentation run.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
