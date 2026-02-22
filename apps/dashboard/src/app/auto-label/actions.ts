"use server";

import { db } from "@segmentation/db";
import { autoLabelProject, autoLabelProjectImage, requestBatchJob } from "@segmentation/db/schema/app";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { requirePageSession } from "@/lib/server/page-auth";

// --- Schemas ---

const createProjectSchema = z.object({
    name: z.string().trim().min(1, "Project name is required").max(100),
});

const updateProjectSchema = z.object({
    name: z.string().trim().min(1, "Project name is required").max(100).optional(),
    apiKeyId: z.string().optional(),
    prompt: z.string().optional(),
    threshold: z.number().min(0).max(1).optional(),
    maskThreshold: z.number().min(0).max(1).optional(),
    latestBatchJobId: z.string().optional(),
});

const registerImagesSchema = z.object({
    images: z.array(z.object({
        fileName: z.string().min(1),
        inputS3Key: z.string().min(1),
        imageWidth: z.number().optional(),
        imageHeight: z.number().optional(),
    })).min(1),
});

// --- Actions ---

export async function getProjects() {
    const session = await requirePageSession();

    try {
        const projects = await db
            .select()
            .from(autoLabelProject)
            .where(eq(autoLabelProject.userId, session.user.id))
            .orderBy(desc(autoLabelProject.createdAt));

        // Let's attach basic stats to each project
        const projectIds = projects.map(p => p.id);
        let imagesByProject: Record<string, number> = {};

        if (projectIds.length > 0) {
            const counts = await db
                .select({
                    projectId: autoLabelProjectImage.projectId,
                    count: sql<number>`count(${autoLabelProjectImage.id})::int`
                })
                .from(autoLabelProjectImage)
                .where(inArray(autoLabelProjectImage.projectId, projectIds))
                .groupBy(autoLabelProjectImage.projectId);

            for (const row of counts) {
                imagesByProject[row.projectId] = row.count;
            }
        }

        let jobsById: Record<string, typeof requestBatchJob.$inferSelect> = {};
        const jobIds = projects.map(p => p.latestBatchJobId).filter(Boolean) as string[];
        if (jobIds.length > 0) {
            const jobs = await db
                .select()
                .from(requestBatchJob)
                .where(inArray(requestBatchJob.id, jobIds));
            for (const job of jobs) {
                jobsById[job.id] = job;
            }
        }

        const enriched = projects.map(p => {
            const imageCount = imagesByProject[p.id] || 0;
            const job = p.latestBatchJobId ? jobsById[p.latestBatchJobId] : null;
            const labeledCount = job ? job.successItems : 0;

            let status: "Running" | "Ready" | "Draft" = "Draft";
            if (job && (job.status === "queued" || job.status === "processing")) {
                status = "Running";
            } else if (imageCount > 0) {
                status = "Ready";
            }

            return {
                ...p,
                imageCount,
                labeledCount,
                status,
                modifiedAt: p.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            };
        });

        return { projects: enriched, ok: true as const };
    } catch (error) {
        console.error("Failed to fetch projects", error);
        return { error: "Failed to fetch projects", ok: false as const };
    }
}

export async function getProject(projectId: string) {
    const session = await requirePageSession();

    try {
        const [project] = await db
            .select()
            .from(autoLabelProject)
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
            .limit(1);

        if (!project) {
            return { error: "Project not found", ok: false as const };
        }

        const images = await db
            .select()
            .from(autoLabelProjectImage)
            .where(eq(autoLabelProjectImage.projectId, projectId))
            .orderBy(desc(autoLabelProjectImage.createdAt));

        let activeBatchJob = null;
        if (project.latestBatchJobId) {
            const [job] = await db
                .select()
                .from(requestBatchJob)
                .where(eq(requestBatchJob.id, project.latestBatchJobId))
                .limit(1);
            activeBatchJob = job || null;
        }

        return { project, images, activeBatchJob, ok: true as const };
    } catch (error) {
        console.error("Failed to fetch project", error);
        return { error: "Failed to fetch project", ok: false as const };
    }
}

export async function createProjectAction(input: z.input<typeof createProjectSchema>) {
    const session = await requirePageSession();
    const parsed = createProjectSchema.safeParse(input);

    if (!parsed.success) {
        return { error: "Invalid request body", ok: false as const };
    }

    const projectId = `proj_${randomUUID()}`;

    try {
        await db.insert(autoLabelProject).values({
            id: projectId,
            userId: session.user.id,
            name: parsed.data.name,
        });

        revalidatePath("/auto-label");
        return { projectId, ok: true as const };
    } catch (error) {
        console.error("Failed to create project", error);
        return { error: "Failed to create project", ok: false as const };
    }
}

export async function updateProjectAction(
    projectId: string,
    input: z.input<typeof updateProjectSchema>
) {
    const session = await requirePageSession();
    const parsed = updateProjectSchema.safeParse(input);

    if (!parsed.success) {
        return { error: "Invalid request body", ok: false as const };
    }

    try {
        await db
            .update(autoLabelProject)
            .set({
                ...parsed.data,
                updatedAt: new Date(),
            })
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)));

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to update project", error);
        return { error: "Failed to update project", ok: false as const };
    }
}

export async function deleteProjectAction(projectId: string) {
    const session = await requirePageSession();

    try {
        await db
            .delete(autoLabelProject)
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)));

        revalidatePath("/auto-label");
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to delete project", error);
        return { error: "Failed to delete project", ok: false as const };
    }
}

export async function registerImagesAction(
    projectId: string,
    input: z.input<typeof registerImagesSchema>
) {
    const session = await requirePageSession();
    const parsed = registerImagesSchema.safeParse(input);

    if (!parsed.success) {
        return { error: "Invalid request body", ok: false as const };
    }

    try {
        // Verify project ownership
        const [project] = await db
            .select({ id: autoLabelProject.id })
            .from(autoLabelProject)
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
            .limit(1);

        if (!project) {
            return { error: "Project not found", ok: false as const };
        }

        const values = parsed.data.images.map((img) => ({
            id: `img_${randomUUID()}`,
            projectId,
            userId: session.user.id,
            fileName: img.fileName,
            inputS3Key: img.inputS3Key,
            imageWidth: img.imageWidth,
            imageHeight: img.imageHeight,
        }));

        await db.insert(autoLabelProjectImage).values(values).onConflictDoNothing();

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to register images", error);
        return { error: "Failed to register images", ok: false as const };
    }
}

// --- Delete Images ---

export async function deleteImagesAction(
    projectId: string,
    imageIds: string[]
) {
    const session = await requirePageSession();

    if (!imageIds.length) {
        return { error: "No images specified.", ok: false as const };
    }

    try {
        // Verify project ownership
        const [project] = await db
            .select({ id: autoLabelProject.id })
            .from(autoLabelProject)
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
            .limit(1);

        if (!project) {
            return { error: "Project not found", ok: false as const };
        }

        await db
            .delete(autoLabelProjectImage)
            .where(
                and(
                    eq(autoLabelProjectImage.projectId, projectId),
                    inArray(autoLabelProjectImage.id, imageIds)
                )
            );

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const };
    } catch (error) {
        console.error("Failed to delete images", error);
        return { error: "Failed to delete images", ok: false as const };
    }
}

// --- Trigger Auto Label (server-side batch call) ---

const triggerAutoLabelSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
});

export async function triggerAutoLabelAction(
    projectId: string,
    input: z.input<typeof triggerAutoLabelSchema>
) {
    const session = await requirePageSession();
    const parsed = triggerAutoLabelSchema.safeParse(input);

    if (!parsed.success) {
        return { error: "API key is required", ok: false as const };
    }

    const { apiKey } = parsed.data;

    try {
        // 1. Verify ownership and load project + images
        const [project] = await db
            .select()
            .from(autoLabelProject)
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
            .limit(1);

        if (!project) {
            return { error: "Project not found", ok: false as const };
        }

        if (!project.prompt?.trim()) {
            return { error: "Please configure a prompt before running Auto Label.", ok: false as const };
        }

        const images = await db
            .select()
            .from(autoLabelProjectImage)
            .where(eq(autoLabelProjectImage.projectId, projectId));

        if (images.length === 0) {
            return { error: "No images in project.", ok: false as const };
        }

        // 2. Call batch API server-side
        const payload = {
            prompt: project.prompt,
            threshold: project.threshold,
            mask_threshold: project.maskThreshold,
            items: images.map((img) => ({ inputS3Key: img.inputS3Key })),
        };

        const rawKey = apiKey.startsWith("Bearer ") ? apiKey.slice(7) : apiKey;

        const res = await fetch("https://api.segmentationapi.com/v1/segment/batch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": rawKey,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { error: data.error || "Failed to trigger batch segmentation.", ok: false as const };
        }

        const json = await res.json();

        // 3. Link job to project
        await db
            .update(autoLabelProject)
            .set({ latestBatchJobId: json.job_id, updatedAt: new Date() })
            .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)));

        revalidatePath(`/auto-label/${projectId}`);
        return { ok: true as const, jobId: json.job_id };
    } catch (error) {
        console.error("Failed to trigger auto label", error);
        return { error: "Failed to trigger Auto Label.", ok: false as const };
    }
}
