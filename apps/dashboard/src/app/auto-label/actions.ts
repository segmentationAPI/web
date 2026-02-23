"use server";

import { auth } from "@segmentation/auth";
import { db } from "@segmentation/db";
import {
    autoLabelProject,
    autoLabelProjectImage,
    batchJob,
    image,
} from "@segmentation/db/schema/app";
import { SegmentationClient } from "@segmentationapi/sdk";
import type { CreateBatchSegmentJobRequest } from "@segmentationapi/sdk";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { requirePageSession } from "@/lib/server/page-auth";
import { createProjectSchema, registerImagesSchema, updateProjectSchema } from "./schemas";

// ── Types ────────────────────────────────────────────────────────────────────────

type ProjectStatus = "Running" | "Ready" | "Draft";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fail(error: string) {
    return { error, ok: false as const };
}

async function findUserProject(userId: string, projectId: string) {
    const [project] = await db
        .select()
        .from(autoLabelProject)
        .where(and(
            eq(autoLabelProject.userId, userId),
            eq(autoLabelProject.id, projectId),
        ))
        .limit(1);
    return project ?? null;
}

function deriveProjectStatus(
    imageCount: number,
    job: typeof batchJob.$inferSelect | null,
): ProjectStatus {
    if (job && (job.status === "queued" || job.status === "processing")) {
        return "Running";
    }
    return imageCount > 0 ? "Ready" : "Draft";
}

// ── Queries ─────────────────────────────────────────────────────────────────────

export async function getProjects() {
    const session = await requirePageSession();

    try {
        const projects = await db
            .select()
            .from(autoLabelProject)
            .where(eq(autoLabelProject.userId, session.user.id))
            .orderBy(desc(autoLabelProject.createdAt));

        if (projects.length === 0) {
            return { projects: [], ok: true as const };
        }

        const projectIds = projects.map(p => p.id);
        const jobIds = projects
            .map(p => p.latestBatchJobId)
            .filter((id): id is string => id != null);

        const [counts, jobs] = await Promise.all([
            db
                .select({
                    projectId: autoLabelProjectImage.projectId,
                    count: sql<number>`count(*)::int`,
                })
                .from(autoLabelProjectImage)
                .where(inArray(autoLabelProjectImage.projectId, projectIds))
                .groupBy(autoLabelProjectImage.projectId),
            jobIds.length > 0
                ? db.select().from(batchJob).where(inArray(batchJob.id, jobIds))
                : [],
        ]);

        const imagesByProject = Object.fromEntries(
            counts.map(r => [r.projectId, r.count]),
        );
        const jobsById = Object.fromEntries(
            jobs.map(j => [j.id, j]),
        );

        const enriched = projects.map(p => {
            const imageCount = imagesByProject[p.id] ?? 0;
            const job = p.latestBatchJobId ? jobsById[p.latestBatchJobId] ?? null : null;

            return {
                ...p,
                imageCount,
                labeledCount: job?.successItems ?? 0,
                status: deriveProjectStatus(imageCount, job),
                modifiedAt: p.updatedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }),
            };
        });

        return { projects: enriched, ok: true as const };
    } catch (error) {
        console.error("Failed to fetch projects", error);
        return fail("Failed to fetch projects");
    }
}

export async function getProject(projectId: string) {
    const session = await requirePageSession();

    try {
        const project = await findUserProject(session.user.id, projectId);
        if (!project) {
            return fail("Project not found");
        }

        const [images, activeBatchJob] = await Promise.all([
            db
                .select({
                    id: image.id,
                    s3Path: image.s3Path,
                    width: image.width,
                    height: image.height,
                    createdAt: image.createdAt,
                })
                .from(autoLabelProjectImage)
                .innerJoin(image, eq(autoLabelProjectImage.imageId, image.id))
                .where(eq(autoLabelProjectImage.projectId, projectId))
                .orderBy(desc(image.createdAt)),
            project.latestBatchJobId
                ? db
                    .select()
                    .from(batchJob)
                    .where(eq(batchJob.id, project.latestBatchJobId))
                    .limit(1)
                    .then(([j]) => j ?? null)
                : null,
        ]);

        return { project, images, activeBatchJob, ok: true as const };
    } catch (error) {
        console.error("Failed to fetch project", error);
        return fail("Failed to fetch project");
    }
}

// ── Mutations ───────────────────────────────────────────────────────────────────

export async function createProjectAction(input: z.input<typeof createProjectSchema>) {
    const session = await requirePageSession();
    const parsed = createProjectSchema.safeParse(input);

    if (!parsed.success) {
        return fail("Invalid request body");
    }

    const projectId = `proj_${randomUUID()}`;

    try {
        await db.insert(autoLabelProject).values({
            id: projectId,
            userId: session.user.id,
            name: parsed.data.name,
            prompts: [],
        });

        revalidatePath("/auto-label");
        return { projectId, ok: true as const };
    } catch (error) {
        console.error("Failed to create project", error);
        return fail("Failed to create project");
    }
}

export async function updateProjectAction(
    projectId: string,
    input: z.input<typeof updateProjectSchema>,
) {
    const session = await requirePageSession();
    const parsed = updateProjectSchema.safeParse(input);

    if (!parsed.success) {
        return fail("Invalid request body");
    }

    try {
        await db
            .update(autoLabelProject)
            .set({ ...parsed.data, updatedAt: new Date() })
            .where(and(
                eq(autoLabelProject.userId, session.user.id),
                eq(autoLabelProject.id, projectId),
            ));

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to update project", error);
        return fail("Failed to update project");
    }
}

export async function deleteProjectAction(projectId: string) {
    const session = await requirePageSession();

    try {
        await db
            .delete(autoLabelProject)
            .where(and(
                eq(autoLabelProject.userId, session.user.id),
                eq(autoLabelProject.id, projectId),
            ));

        revalidatePath("/auto-label");
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to delete project", error);
        return fail("Failed to delete project");
    }
}

export async function registerImagesAction(
    projectId: string,
    input: z.input<typeof registerImagesSchema>,
) {
    const session = await requirePageSession();
    const parsed = registerImagesSchema.safeParse(input);

    if (!parsed.success) {
        return fail("Invalid request body");
    }

    try {
        const project = await findUserProject(session.user.id, projectId);
        if (!project) {
            return fail("Project not found");
        }

        const inserted = await db
            .insert(image)
            .values(parsed.data.images.map(img => ({
                id: `img_${randomUUID()}`,
                userId: session.user.id,
                s3Path: img.s3Path,
                width: img.width,
                height: img.height,
            })))
            .onConflictDoUpdate({
                target: [image.userId, image.s3Path],
                set: { width: sql`excluded.width`, height: sql`excluded.height` },
            })
            .returning({ id: image.id });

        await db
            .insert(autoLabelProjectImage)
            .values(inserted.map(row => ({ projectId, imageId: row.id })))
            .onConflictDoNothing();

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to register images", error);
        return fail("Failed to register images");
    }
}

export async function deleteImagesAction(
    projectId: string,
    imageIds: string[],
) {
    const session = await requirePageSession();

    if (imageIds.length === 0) {
        return fail("No images specified.");
    }

    try {
        const project = await findUserProject(session.user.id, projectId);
        if (!project) {
            return fail("Project not found");
        }

        await db
            .delete(autoLabelProjectImage)
            .where(and(
                eq(autoLabelProjectImage.projectId, projectId),
                inArray(autoLabelProjectImage.imageId, imageIds),
            ));

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to delete images", error);
        return fail("Failed to delete images");
    }
}

// ── Trigger Auto Label ──────────────────────────────────────────────────────────

export async function triggerAutoLabelAction(projectId: string) {
    const session = await requirePageSession();

    try {
        const project = await findUserProject(session.user.id, projectId);
        if (!project) {
            return fail("Project not found");
        }

        if (!project.prompts?.some(p => p.trim())) {
            return fail("Please configure at least one prompt before running Auto Label.");
        }

        const [projectImages, tokenResponse] = await Promise.all([
            db
                .select({ s3Path: image.s3Path })
                .from(autoLabelProjectImage)
                .innerJoin(image, eq(autoLabelProjectImage.imageId, image.id))
                .where(eq(autoLabelProjectImage.projectId, projectId)),
            auth.api.getToken({ headers: await headers() }),
        ]);

        if (projectImages.length === 0) {
            return fail("No images in project.");
        }

        if (!tokenResponse?.token) {
            return fail("Failed to retrieve authentication token.");
        }

        const prompts = project.prompts.map(prompt => prompt.trim()).filter(Boolean);
        if (prompts.length === 0) {
            return fail("Please configure at least one prompt before running Auto Label.");
        }

        const request: CreateBatchSegmentJobRequest = {
            prompts,
            threshold: project.threshold,
            maskThreshold: project.maskThreshold,
            items: projectImages.map(row => ({ inputS3Key: row.s3Path })),
        };

        const client = new SegmentationClient({ jwt: tokenResponse.token });
        const result = await client.createBatchSegmentJob(request);

        await db
            .update(autoLabelProject)
            .set({ latestBatchJobId: result.jobId, updatedAt: new Date() })
            .where(and(
                eq(autoLabelProject.userId, session.user.id),
                eq(autoLabelProject.id, projectId),
            ));

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const, jobId: result.jobId };
    } catch (error) {
        console.error("Failed to trigger auto label", error);
        return fail("Failed to trigger Auto Label.");
    }
}
