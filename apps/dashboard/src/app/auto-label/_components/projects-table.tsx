"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "Running" | "Ready" | "Draft";

interface Project {
  id: string;
  name: string;
  imageCount: number;
  labeledCount: number;
  status: ProjectStatus;
  modifiedAt: string;
}

// ─── Stub data ────────────────────────────────────────────────────────────────



// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "Running") {
    return (
      <Badge
        variant="outline"
        className="h-6 gap-1.5 rounded-full border-secondary/30 bg-secondary/10 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
        </span>
        Running
      </Badge>
    );
  }

  if (status === "Ready") {
    return (
      <Badge
        variant="outline"
        className="h-6 gap-1.5 rounded-full border-primary/30 bg-primary/10 font-mono text-[10px] uppercase tracking-[0.12em] text-primary"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Ready
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="h-6 gap-1.5 rounded-full border-border/50 bg-muted/30 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      Draft
    </Badge>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ labeled, total }: { labeled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((labeled / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground">
        <span>{pct}%</span>
        <span>
          {labeled.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <Progress value={pct} className="gap-0" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Empty className="rounded-xl border-border/50 bg-muted/10 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-full bg-muted/40">
          <FolderOpen className="h-5 w-5 text-muted-foreground/60" />
        </EmptyMedia>
        <EmptyTitle className="font-sans text-sm text-foreground">No projects yet</EmptyTitle>
        <EmptyDescription className="mt-1 font-mono text-[10px] text-muted-foreground">
          Create a new project to start auto-labeling images.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectsTable({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  function handleNewProject() {
    router.push(`/auto-label/new`);
  }

  return (
    <div className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75">
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Overview
          </p>
          <h1 className="mt-1 font-display text-2xl tracking-[0.03em] text-foreground">
            Projects
          </h1>
        </div>

        <Button
          onClick={handleNewProject}
          size="sm"
          className="gap-1.5 rounded-xl border border-primary/50 bg-primary/20 font-mono text-[11px] uppercase tracking-[0.14em] text-primary hover:bg-primary/30"
        >
          <Plus className="size-3.5" />
          New Project
        </Button>
      </div>

      <div className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-button]:hidden">
        {projects.length === 0 ? (
          <div className="p-3">
            <EmptyState />
          </div>
        ) : (
          <Table className="min-w-full">
            <TableHeader className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 py-2">Project</TableHead>
                <TableHead className="w-[110px] px-3 py-2">Images</TableHead>
                <TableHead className="w-[130px] px-3 py-2">Status</TableHead>
                <TableHead className="w-[170px] px-3 py-2">Progress</TableHead>
                <TableHead className="w-[90px] px-3 py-2 text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ─── Project row ──────────────────────────────────────────────────────────────

function ProjectRow({ project }: { project: Project }) {
  const router = useRouter();

  return (
    <TableRow className="group border-border/50 bg-muted/30 transition-colors hover:bg-muted/50">
      <TableCell className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-background/70">
            <FolderOpen className="size-3.5 text-muted-foreground group-hover:text-primary" />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-sans text-sm font-medium text-foreground">
              {project.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{project.modifiedAt}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {project.imageCount.toLocaleString()}
      </TableCell>

      <TableCell className="px-3 py-3">
        <StatusBadge status={project.status} />
      </TableCell>

      <TableCell className="px-3 py-3">
        <ProgressBar labeled={project.labeledCount} total={project.imageCount} />
      </TableCell>

      <TableCell className="px-3 py-3 text-right">
        <Button
          onClick={() => router.push(`/auto-label/${project.id}`)}
          size="sm"
          variant="outline"
          className="h-7 gap-1 rounded-lg border-border/60 bg-background/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/50 hover:text-foreground"
          aria-label={`Open project ${project.name}`}
        >
          Open
          <ArrowRight className="size-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
