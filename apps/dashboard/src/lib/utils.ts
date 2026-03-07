import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function putManyToPresignedS3(uploads: Array<{ url: string; file: File | Blob }>) {
  return Promise.allSettled(uploads.map(({ url, file }) => putToPresignedS3(url, file)));
}

export async function putToPresignedS3(url: string, file: File | Blob) {
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
}
