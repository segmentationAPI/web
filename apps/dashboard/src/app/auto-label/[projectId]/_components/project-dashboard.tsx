"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileImage,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Settings2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SegmentationClient } from "@segmentationapi/sdk";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  deleteImagesAction,
  getProject,
  registerImagesAction,
  updateProjectAction,
  triggerAutoLabelAction,
} from "../../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.gif";

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return null;
  }
}

function fileNameFromS3Path(s3Path: string): string {
  return s3Path.split("/").pop() ?? s3Path;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(0.5);
  const [maskThreshold, setMaskThreshold] = useState(0.5);
  const [savingConfig, setSavingConfig] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload state
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Action state
  const [isTriggering, setIsTriggering] = useState(false);

  // Initial load & Polling
  const fetchData = async () => {
    const res = await getProject(projectId);
    if (!res.ok) {
      setError(res.error || "Failed to load project");
    } else {
      setProject(res.project);
      setImages(res.images || []);
      setActiveJob(res.activeRequest || null);
      setPrompts(res.project.prompts?.length ? res.project.prompts : [""]);
      setThreshold(res.project.threshold ?? 0.5);
      setMaskThreshold(res.project.maskThreshold ?? 0.5);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    // Poll every 5 seconds if a job is running
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "processing")) {
      const interval = setInterval(() => {
        void fetchData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeJob, projectId]);

  // ── Config ──────────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const res = await updateProjectAction(projectId, {
      prompts: prompts.filter((p) => p.trim()),
      threshold,
      maskThreshold,
    });
    if (res.ok) {
      toast.success("Configuration saved.");
      setShowConfig(false);
    } else {
      toast.error(res.error || "Failed to save configuration.");
    }
    setSavingConfig(false);
  };

  // ── Auto Label ──────────────────────────────────────────────────────────

  const handleAutoLabel = async () => {
    setIsTriggering(true);
    try {
      const res = await triggerAutoLabelAction(projectId);

      if (!res.ok) {
        throw new Error(res.error || "Failed to trigger Auto Label.");
      }

      toast.success("Auto Label request started!");
      void fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to trigger Auto Label.");
    } finally {
      setIsTriggering(false);
    }
  };

  // ── Selection ───────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  }

  // ── Delete Selected ─────────────────────────────────────────────────────

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await deleteImagesAction(projectId, Array.from(selectedIds));
      if (!res.ok) {
        toast.error(res.error || "Failed to delete images.");
      } else {
        toast.success(`Deleted ${selectedIds.size} image${selectedIds.size !== 1 ? "s" : ""}.`);
        setSelectedIds(new Set());
        void fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete images.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Upload ──────────────────────────────────────────────────────────────

  function addUploadFiles(incoming: File[]) {
    void uploadFiles(incoming);
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadedCount(0);
    setUploadTotal(files.length);

    try {
      const { data: tokenData, error: tokenError } = await authClient.token();
      if (tokenError || !tokenData) {
        toast.error("Failed to retrieve authentication token.");
        return;
      }

      const client = new SegmentationClient({ jwt: tokenData.token });
      const successfulUploads: {
        s3Path: string;
        width?: number;
        height?: number;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const contentType = file.type || "image/png";

        const [presignedUpload, dims] = await Promise.all([
          client.createPresignedUpload({ contentType }),
          readImageDimensions(file),
        ]);
        await client.uploadImage({
          contentType,
          data: file,
          uploadUrl: presignedUpload.uploadUrl,
        });

        successfulUploads.push({
          s3Path: presignedUpload.inputS3Key,
          ...dims,
        });

        setUploadedCount(i + 1);
      }

      if (successfulUploads.length > 0) {
        const res = await registerImagesAction(projectId, {
          images: successfulUploads,
        });
        if (!res.ok) throw new Error(res.error || "Failed to register images.");
      }

      toast.success(
        `Uploaded ${successfulUploads.length} image${successfulUploads.length !== 1 ? "s" : ""}.`,
      );
      void fetchData();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Upload failed.";
      const apiErr = err as { body?: { error?: string; message?: string } };
      const reason = apiErr?.body?.error || apiErr?.body?.message || msg;
      toast.error(`Upload failed: ${reason}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addUploadFiles(Array.from(e.dataTransfer.files));
  }

  function handleUploadInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addUploadFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="mt-4 font-mono text-xs">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-destructive">
        <p className="font-mono text-xs">{error || "Project not found."}</p>
      </div>
    );
  }

  const isRunning =
    activeJob && (activeJob.status === "queued" || activeJob.status === "processing");
  const isSuccess =
    activeJob && (activeJob.status === "completed" || activeJob.status === "completed_with_errors");
  const allSelected = images.length > 0 && selectedIds.size === images.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="flex flex-col gap-8 pb-10 pt-2 lg:px-4">
      {/* ── Dashboard Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Project Dashboard
          </p>
          <h1 className="font-display text-2xl tracking-[0.03em] text-foreground">
            {project.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="h-8 gap-2 rounded-lg border-border/60 bg-background/60 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-transform"
          >
            <Settings2 className="size-3.5" />
            Config
          </Button>

          <Button
            size="sm"
            disabled={isRunning || isTriggering || images.length === 0}
            onClick={() => void handleAutoLabel()}
            className="h-8 gap-2 rounded-lg border border-primary/50 bg-primary/20 px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-primary hover:bg-primary/30 disabled:opacity-50 transition-transform active:scale-95"
          >
            {isRunning || isTriggering ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" fill="currentColor" />
            )}
            {isRunning ? "Running..." : "Auto Label All"}
          </Button>
        </div>
      </div>
      <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Download generated outputs directly from your S3/CloudFront artifacts.
      </p>

      {/* ── Config Panel ────────────────────────────────────────────────── */}
      {showConfig && (
        <div className="glass-panel rounded-xl border-border/70 bg-card/75 p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="font-sans text-sm font-medium text-foreground">Configuration</h3>
          {/* Hidden honeypot fields to absorb browser autofill */}
          <input
            type="text"
            name="fakeusernameremember"
            autoComplete="username"
            style={{
              position: "absolute",
              opacity: 0,
              height: 0,
              width: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            type="password"
            name="fakepasswordremember"
            autoComplete="current-password"
            style={{
              position: "absolute",
              opacity: 0,
              height: 0,
              width: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Detection Prompts
              </Label>
              <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                Optional. Leave blank for auto mode.
              </p>
              <div className="flex flex-col gap-2">
                {prompts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      name={`detection-prompt-${i}-nofill`}
                      placeholder="e.g. cells"
                      value={p}
                      onChange={(e) => {
                        const next = [...prompts];
                        next[i] = e.target.value;
                        setPrompts(next);
                      }}
                      className="h-9 rounded-lg border-border/60 bg-background/60 px-3 text-sm focus-visible:border-primary/60"
                      autoComplete="one-time-code"
                    />
                    {prompts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrompts(prompts.filter((_, j) => j !== i))}
                        className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompts([...prompts, ""])}
                  className="h-8 w-fit gap-1.5 rounded-lg border-border/60 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                  Add Prompt
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="threshold"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Confidence Threshold
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="h-9 rounded-lg border-border/60 bg-background/60 px-3 text-sm font-mono focus-visible:border-primary/60"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="maskThreshold"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Mask Threshold
                </Label>
                <Input
                  id="maskThreshold"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={maskThreshold}
                  onChange={(e) => setMaskThreshold(parseFloat(e.target.value))}
                  className="h-9 rounded-lg border-border/60 bg-background/60 px-3 text-sm font-mono focus-visible:border-primary/60"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => void handleSaveConfig()}
              disabled={savingConfig}
              className="h-8 rounded-lg font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              {savingConfig ? "Saving..." : "Save Config"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Meta stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground z-10">
            Status
          </span>
          <span className="font-sans text-sm font-medium text-foreground z-10">
            {activeJob
              ? activeJob.status === "processing" || activeJob.status === "queued"
                ? "Running"
                : activeJob.status === "completed"
                  ? "Completed"
                  : activeJob.status === "completed_with_errors"
                    ? "Completed with errors"
                    : "Failed"
              : "Ready to label"}
          </span>

          {activeJob && activeJob.totalTasks > 0 && (
            <Progress
              value={Math.round(
                ((activeJob.successTasks + activeJob.failedTasks) / activeJob.totalTasks) * 100,
              )}
              className="mt-2 gap-0"
            />
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Images
          </span>
          <span className="font-sans text-sm font-medium text-foreground">
            {images.length.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Labeled
          </span>
          <span className="font-sans text-sm font-medium text-foreground">
            {activeJob ? activeJob.successTasks : 0}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Last modified
          </span>
          <span className="font-sans text-sm font-medium text-foreground">
            {new Date(project.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ── Dataset Section ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <h2 className="font-sans text-base font-medium text-foreground">Dataset</h2>
          </div>
        </div>

        {/* ── Upload Zone ─────────────────────────────────────────────────── */}
        <Button
          type="button"
          variant="ghost"
          disabled={uploading}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && uploadInputRef.current?.click()}
          className={`flex items-center gap-3 rounded-xl border-2 border-dashed transition-colors px-5 py-4 ${
            dragging
              ? "border-primary/70 bg-primary/10"
              : "border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-50"
          }`}
        >
          <UploadCloud
            className={`size-5 shrink-0 transition-colors ${dragging ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className="text-left">
            <p className="font-sans text-sm font-medium text-foreground">
              Drop images here or click to browse
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              JPEG, PNG, WebP, BMP, TIFF, GIF · Multiple files supported
            </p>
          </div>
        </Button>
        <input
          ref={uploadInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          className="hidden"
          onChange={handleUploadInputChange}
          disabled={uploading}
        />

        {/* ── Upload Progress ─────────────────────────────────────────────── */}
        {uploading && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
              <span className="text-primary flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" /> Uploading...
              </span>
              <span className="text-muted-foreground">
                {uploadedCount} / {uploadTotal}
              </span>
            </div>
            <Progress
              value={uploadTotal > 0 ? Math.max(2, (uploadedCount / uploadTotal) * 100) : 0}
              className="gap-0"
            />
          </div>
        )}

        {/* ── Selection Actions Bar ───────────────────────────────────────── */}
        {someSelected && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="font-mono text-[11px] text-muted-foreground">
              {selectedIds.size} image{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 rounded-lg px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isDeleting}
                onClick={() => void handleDeleteSelected()}
                className="h-7 gap-1.5 rounded-lg border-destructive/40 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive hover:bg-destructive/10 hover:border-destructive/60"
              >
                {isDeleting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* ── Image Table ─────────────────────────────────────────────────── */}
        <div className="glass-panel overflow-hidden rounded-xl border-border/70 bg-card/75">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-button]:hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_120px_100px_40px] items-center gap-4 border-b border-border/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <label className="grid place-items-center cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={images.length === 0}
                  className="size-3.5 cursor-pointer border-border/60"
                />
              </label>
              <span>Name</span>
              <span>Dimensions</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>

            {/* Table Body */}
            <div className="flex max-h-[500px] flex-col overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-button]:hidden">
              {images.length === 0 ? (
                <Empty className="border-0 py-8">
                  <EmptyHeader>
                    <EmptyTitle className="font-mono text-xs">No images yet</EmptyTitle>
                    <EmptyDescription className="font-mono text-xs">
                      Upload images above to get started.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                images.map((img) => {
                  const isChecked = selectedIds.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={cn(
                        "group grid grid-cols-[40px_1fr_120px_100px_40px] items-center gap-4 border-b border-border/50 px-4 py-3 text-sm transition-colors last:border-0",
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30",
                      )}
                    >
                      <label className="grid place-items-center cursor-pointer">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(img.id)}
                          className="size-3.5 cursor-pointer border-border/60"
                        />
                      </label>

                      <div className="flex min-w-0 items-center gap-3">
                        <FileImage className="size-4 shrink-0 text-muted-foreground/70" />
                        <span className="truncate font-sans font-medium text-foreground">
                          {fileNameFromS3Path(img.s3Path)}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] text-muted-foreground">
                        {img.width && img.height ? `${img.width}×${img.height}` : "—"}
                      </span>

                      <Badge
                        variant="outline"
                        className="h-6 gap-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        <div
                          className={`size-1.5 rounded-full ${isSuccess ? "bg-primary" : "bg-border/80"}`}
                        />
                        {isSuccess ? "Labeled" : "Unlabeled"}
                      </Badge>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-background/80 hover:text-foreground group-hover:opacity-100"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
