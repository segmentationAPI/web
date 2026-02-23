"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
                </span>
                Running
            </span>
        );
    }

    if (status === "Ready") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Ready
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            Draft
        </span>
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted/40">
                <FolderOpen className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="mt-4 font-sans text-sm font-medium text-foreground">
                No projects yet
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Create a new project to start auto-labeling images.
            </p>
        </div>
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
            {/* ── Page header ──────────────────────────────────────────────── */}
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

            {/* ── Table content ────────────────────────────────────────────── */}
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-button]:hidden pb-2">
                <div className="flex flex-col gap-1.5 pb-4 pt-3">
                    {/* Column headers: same grid + same px-3 as rows, icon spacer aligns text */}
                    <div className="grid grid-cols-[1fr_90px_120px_140px_80px] items-center gap-3 px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <div className="w-8 shrink-0" />
                            <span>Project</span>
                        </div>
                        <span>Images</span>
                        <span>Status</span>
                        <span>Progress</span>
                        <span />
                    </div>

                    {projects.length === 0 ? (
                        <EmptyState />
                    ) : (
                        projects.map((project) => (
                            <ProjectRow key={project.id} project={project} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Project row ──────────────────────────────────────────────────────────────

function ProjectRow({ project }: { project: Project }) {
    const router = useRouter();

    return (
        <div className="group grid grid-cols-[1fr_90px_120px_140px_80px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-3 transition-colors hover:border-primary/35 hover:bg-muted/50">
            {/* Name + date */}
            <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-background/70">
                    <FolderOpen className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </span>
                <div className="min-w-0">
                    <span className="block truncate font-sans text-sm font-medium text-foreground">
                        {project.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                        {project.modifiedAt}
                    </span>
                </div>
            </div>

            {/* Image count */}
            <span className="font-mono text-xs text-muted-foreground">
                {project.imageCount.toLocaleString()}
            </span>

            {/* Status */}
            <StatusBadge status={project.status} />

            {/* Progress */}
            <ProgressBar labeled={project.labeledCount} total={project.imageCount} />

            {/* Open */}
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
        </div>
    );
}
