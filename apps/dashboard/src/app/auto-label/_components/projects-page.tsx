"use client";

import { ArrowRight, Loader2, Plus, ScanSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createLabelProjectAction } from "@/app/auto-label/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LabelProject } from "@segmentation/db/schema/app";
import Link from "next/link";

const STATUS_LABELS: Record<LabelProject["status"], string> = {
  draft: "Draft",
  ready: "Ready",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_COLORS: Record<LabelProject["status"], string> = {
  draft: "text-muted-foreground",
  ready: "text-secondary",
  processing: "text-primary",
  completed: "text-secondary",
  failed: "text-destructive",
};

const STATUS_DOT: Record<LabelProject["status"], string> = {
  draft: "bg-muted-foreground",
  ready: "bg-secondary",
  processing: "bg-primary animate-pulse",
  completed: "bg-secondary",
  failed: "bg-destructive",
};

function ProjectCard({ project }: { project: LabelProject }) {
  const progress =
    project.totalImages > 0
      ? Math.round((project.processedImages / project.totalImages) * 100)
      : 0;

  return (
    <Link href={`/auto-label/${project.id}`}>
      <article className="glass-panel card-stack group flex h-full flex-col rounded-[1.35rem] border border-border/70 p-5 transition-colors hover:border-primary/50">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug text-foreground">{project.name}</h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_COLORS[project.status]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[project.status]}`} />
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        <p className="mb-4 truncate font-mono text-xs text-muted-foreground">
          Prompt: <span className="text-foreground">{project.prompt}</span>
        </p>

        {project.totalImages > 0 && (
          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{project.processedImages} / {project.totalImages} images</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            {project.totalImages > 0 ? `${project.totalImages} images` : "No images yet"}
          </p>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </article>
    </Link>
  );
}

function CreateProjectDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [apiKeyPlaintext, setApiKeyPlaintext] = useState("");
  const [prompt, setPrompt] = useState("");
  const [outputCoco, setOutputCoco] = useState(true);
  const [outputClassPngs, setOutputClassPngs] = useState(false);
  const [outputYolo, setOutputYolo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outputCoco && !outputClassPngs && !outputYolo) {
      toast.error("Select at least one output format");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createLabelProjectAction({
        name,
        apiKeyPlaintext,
        prompt,
        outputCoco,
        outputClassPngs,
        outputYolo,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Project created");
      onCreated(result.projectId);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="glass-panel relative w-full max-w-md rounded-[1.5rem] border border-border/70 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              New Project
            </p>
            <h2 className="font-display text-2xl">Create auto-label project</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Project Name
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My dataset v1"
              className="border-input bg-background/60"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKeyPlaintext}
              onChange={(e) => setApiKeyPlaintext(e.target.value)}
              placeholder="sam3_…"
              className="border-input bg-background/60 font-mono"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Stored securely and used for all uploads and segmentation in this project.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Segmentation Prompt
            </Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. car, person, tree"
              className="border-input bg-background/60"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Describe what to segment in each image.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Output Formats
            </p>
            {[
              { id: "coco", label: "COCO JSON", checked: outputCoco, onChange: setOutputCoco },
              { id: "pngs", label: "Per-class PNGs", checked: outputClassPngs, onChange: setOutputClassPngs },
              { id: "yolo", label: "YOLO Segmentation", checked: outputYolo, onChange: setOutputYolo },
            ].map((opt) => (
              <div key={opt.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={opt.id}
                  checked={opt.checked}
                  onCheckedChange={(v) => opt.onChange(v === true)}
                />
                <Label htmlFor={opt.id} className="cursor-pointer text-sm text-foreground">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Create Project
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AutoLabelProjectsPage({
  initialProjects,
}: {
  initialProjects: LabelProject[];
}) {
  const router = useRouter();
  const [projects] = useState<LabelProject[]>(initialProjects);
  const [showCreate, setShowCreate] = useState(false);

  function handleCreated(projectId: string) {
    setShowCreate(false);
    router.push(`/auto-label/${projectId}`);
  }

  return (
    <>
      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Auto-Label
          </p>
          <h1 className="font-display text-3xl tracking-[0.02em]">Projects</h1>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
        >
          <Plus className="size-3.5" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="inline-flex rounded-2xl border border-border/70 bg-background/60 p-5">
              <ScanSearch className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-xl">No projects yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create a project, upload your images, and get segmentation masks for your entire
                dataset automatically.
              </p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
            >
              <Plus className="size-3.5" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  );
}
