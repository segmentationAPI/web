"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  ImageIcon,
  Layers,
  Loader2,
  Rocket,
  UploadCloud,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { startLabelProjectAction } from "@/app/auto-label/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LabelProject } from "@segmentation/db/schema/app";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadedFile = {
  name: string;
  size: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

type StatusPollData = {
  status: LabelProject["status"];
  totalImages: number;
  processedImages: number;
  failedImages: number;
  resultKey: string | null;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const UPLOAD_CONCURRENCY = 3;
const POLL_INTERVAL_MS = 5000;

// ─── Upload view ──────────────────────────────────────────────────────────────

function UploadView({
  project,
  onStarted,
}: {
  project: LabelProject;
  onStarted: (updated: LabelProject) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);

  const uploadedCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const totalImages = project.totalImages + uploadedCount;
  const estimatedCost = (totalImages * 0.01).toFixed(2);

  const uploadFile = useCallback(
    async (file: File, index: number) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: "error", error: "Unsupported file type" } : f)),
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: "error", error: "File exceeds 10 MB limit" } : f)),
        );
        return;
      }

      setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)));

      const formData = new FormData();
      formData.append("imageFile", file);
      formData.append("projectId", project.id);
      formData.append("contentType", file.type);

      try {
        const response = await fetch("/api/auto-label/upload", { method: "POST", body: formData });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          const error = body?.error ?? `Upload failed (${response.status})`;
          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "error", error } : f)));
          return;
        }

        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "done" } : f)));
      } catch {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: "error", error: "Network error" } : f)),
        );
      }
    },
    [project.id],
  );

  async function handleFilesSelected(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;

    const startIndex = files.length;
    const fileArray = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileArray.map((f) => ({ name: f.name, size: f.size, status: "queued" as const }))]);
    setUploading(true);

    for (let i = 0; i < fileArray.length; i += UPLOAD_CONCURRENCY) {
      const batch = fileArray.slice(i, i + UPLOAD_CONCURRENCY);
      await Promise.all(batch.map((file, j) => uploadFile(file, startIndex + i + j)));
    }

    setUploading(false);
  }

  async function handleStart() {
    if (totalImages === 0) {
      toast.error("Upload at least one image first");
      return;
    }

    setStarting(true);
    try {
      const result = await startLabelProjectAction({ projectId: project.id });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Job started!");
      onStarted(result.project);
    } catch {
      toast.error("Failed to start job");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Dataset
          </CardDescription>
          <CardTitle className="font-display tracking-[0.03em]">Upload Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); void handleFilesSelected(e.dataTransfer.files); }}
            className={[
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 transition-colors",
              isDragOver ? "border-secondary/70 bg-secondary/10" : "border-border/70 bg-background/45 hover:border-primary/60",
            ].join(" ")}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {uploading ? "Uploading…" : "Drag images here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPEG, PNG, WebP, GIF, AVIF · Max 10 MB per file
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="sr-only"
            onChange={(e) => void handleFilesSelected(e.target.files)}
          />

          {files.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">
                  {uploadedCount} uploaded
                  {errorCount > 0 ? ` · ${errorCount} failed` : ""}
                  {" · "}{files.filter((f) => f.status === "queued" || f.status === "uploading").length} pending
                </span>
                {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {files.slice(-20).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    {f.status === "done" && <CheckCircle2 className="h-3 w-3 shrink-0 text-secondary" />}
                    {f.status === "error" && <XCircle className="h-3 w-3 shrink-0 text-destructive" />}
                    {f.status === "uploading" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />}
                    {f.status === "queued" && <div className="h-3 w-3 shrink-0 rounded-full border border-border/70" />}
                    <span className={`truncate ${f.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {f.name}{f.error ? ` — ${f.error}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget + start */}
      {totalImages > 0 && (
        <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
          <CardHeader>
            <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
              Summary
            </CardDescription>
            <CardTitle className="font-display tracking-[0.03em]">Ready to Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Images", value: totalImages.toLocaleString() },
                { label: "Tokens", value: totalImages.toLocaleString() },
                { label: "Est. Cost", value: `$${estimatedCost}` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/70 bg-background/50 p-4 text-center">
                  <p className="font-display text-2xl text-foreground">{stat.value}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Output Formats
              </p>
              <div className="flex flex-wrap gap-2">
                {project.outputCoco && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 font-mono text-[11px] text-secondary">
                    <FileJson className="h-3 w-3" /> COCO JSON
                  </span>
                )}
                {project.outputClassPngs && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 font-mono text-[11px] text-secondary">
                    <Layers className="h-3 w-3" /> Per-class PNGs
                  </span>
                )}
                {project.outputYolo && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 font-mono text-[11px] text-secondary">
                    <ImageIcon className="h-3 w-3" /> YOLO Seg
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => void handleStart()}
              disabled={starting || uploading || totalImages === 0}
              className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
            >
              {starting ? (
                <><Loader2 className="size-3.5 animate-spin" />Starting…</>
              ) : (
                <><Rocket className="size-3.5" />Start Labeling</>
              )}
            </Button>

            {uploading && (
              <p className="text-center text-xs text-muted-foreground">
                Wait for all uploads to finish before starting.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Processing view ──────────────────────────────────────────────────────────

function ProcessingView({
  initialProject,
  onCompleted,
}: {
  initialProject: LabelProject;
  onCompleted: (data: StatusPollData) => void;
}) {
  const [pollData, setPollData] = useState<StatusPollData>({
    status: initialProject.status,
    totalImages: initialProject.totalImages,
    processedImages: initialProject.processedImages,
    failedImages: initialProject.failedImages,
    resultKey: initialProject.resultKey,
  });

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/auto-label/status/${initialProject.id}`);
        if (!response.ok) return;
        const data = (await response.json()) as StatusPollData;
        setPollData(data);
        if (data.status === "completed" || data.status === "failed") {
          onCompleted(data);
        }
      } catch {
        // ignore transient errors
      }
    };

    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    void poll();
    return () => clearInterval(interval);
  }, [initialProject.id, onCompleted]);

  const progress =
    pollData.totalImages > 0
      ? Math.round((pollData.processedImages / pollData.totalImages) * 100)
      : 0;

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Status
        </CardDescription>
        <CardTitle className="font-display tracking-[0.03em]">Processing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {pollData.processedImages} / {pollData.totalImages} images segmented
            </span>
            <span className="font-mono text-foreground">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          {pollData.failedImages > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pollData.failedImages} image{pollData.failedImages > 1 ? "s" : ""} failed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Running SAM 3 segmentation — this page will update automatically.
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Completed view ───────────────────────────────────────────────────────────

function CompletedView({ project, pollData }: { project: LabelProject; pollData: StatusPollData }) {
  const failed = pollData.status === "failed";

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
          {failed ? "Failed" : "Complete"}
        </CardDescription>
        <CardTitle className="font-display tracking-[0.03em]">
          {failed ? "Job failed" : "Labels ready"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {failed ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            The job encountered an unrecoverable error. Please create a new project and try again.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-secondary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {pollData.processedImages.toLocaleString()} image{pollData.processedImages !== 1 ? "s" : ""} labeled
                successfully.
                {pollData.failedImages > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({pollData.failedImages} could not be segmented and are excluded.)
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Download Results
              </p>
              <div className="flex flex-wrap gap-2">
                {project.outputCoco && (
                  <a
                    href={`/api/auto-label/download/${project.id}?format=coco`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs text-foreground transition-colors hover:bg-primary/20"
                  >
                    <FileJson className="h-3.5 w-3.5 text-primary" />
                    COCO JSON
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
                {project.outputClassPngs && (
                  <a
                    href={`/api/auto-label/download/${project.id}?format=class_pngs`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs text-foreground transition-colors hover:bg-primary/20"
                  >
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Per-class PNGs
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
                {project.outputYolo && (
                  <a
                    href={`/api/auto-label/download/${project.id}?format=yolo`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs text-foreground transition-colors hover:bg-primary/20"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    YOLO Seg
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Download links are generated fresh on each click.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function ProjectDetail({ project: initialProject }: { project: LabelProject }) {
  const [project, setProject] = useState<LabelProject>(initialProject);
  const [pollData, setPollData] = useState<StatusPollData | null>(null);

  const isProcessing = project.status === "processing";
  const isDone = project.status === "completed" || project.status === "failed";
  const isUpload = !isProcessing && !isDone;

  const handleCompleted = useCallback((data: StatusPollData) => {
    setPollData(data);
    setProject((prev) => ({ ...prev, status: data.status }));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/auto-label"
          className="mb-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Auto-Label · Project
            </p>
            <h1 className="font-display text-3xl tracking-[0.02em]">{project.name}</h1>
          </div>
          <span className={[
            "mt-1 inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em]",
            project.status === "completed" ? "text-secondary" :
            project.status === "processing" ? "text-primary" :
            project.status === "failed" ? "text-destructive" : "text-muted-foreground",
          ].join(" ")}>
            <span className={[
              "h-1.5 w-1.5 rounded-full",
              project.status === "completed" ? "bg-secondary" :
              project.status === "processing" ? "bg-primary animate-pulse" :
              project.status === "failed" ? "bg-destructive" : "bg-muted-foreground",
            ].join(" ")} />
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>
      </div>

      {isUpload && <UploadView project={project} onStarted={setProject} />}
      {isProcessing && <ProcessingView initialProject={project} onCompleted={handleCompleted} />}
      {isDone && (
        <CompletedView
          project={project}
          pollData={pollData ?? {
            status: project.status,
            totalImages: project.totalImages,
            processedImages: project.processedImages,
            failedImages: project.failedImages,
            resultKey: project.resultKey,
          }}
        />
      )}
    </div>
  );
}
