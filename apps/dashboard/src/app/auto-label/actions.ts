"use server";

import { db } from "@segmentation/db";
import { labelProject, type LabelProject } from "@segmentation/db/schema/app";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requirePageSession } from "@/lib/server/page-auth";
import { runLabelProjectProcessing } from "@/lib/server/auto-label/processor";

// ─── Create project ───────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  apiKeyPlaintext: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(200),
  outputCoco: z.boolean().default(true),
  outputClassPngs: z.boolean().default(false),
  outputYolo: z.boolean().default(false),
});

type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function createLabelProjectAction(
  input: z.input<typeof createProjectSchema>,
): Promise<CreateProjectResult> {
  const session = await requirePageSession();
  const parsed = createProjectSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Invalid request" };
  }

  const { name, apiKeyPlaintext, prompt, outputCoco, outputClassPngs, outputYolo } = parsed.data;
  const projectId = `lp_${crypto.randomUUID()}`;

  try {
    await db.insert(labelProject).values({
      id: projectId,
      userId: session.user.id,
      name,
      apiKeyPlaintext,
      prompt,
      status: "draft",
      outputCoco,
      outputClassPngs,
      outputYolo,
    });
  } catch (error) {
    console.error("Failed to create label project", error);
    return { ok: false, error: "Failed to create project" };
  }

  revalidatePath("/auto-label");
  return { ok: true, projectId };
}

// ─── Delete project ───────────────────────────────────────────────────────────

const deleteProjectSchema = z.object({ projectId: z.string().min(1) });

type DeleteProjectResult = { ok: true } | { ok: false; error: string };

export async function deleteLabelProjectAction(
  input: z.input<typeof deleteProjectSchema>,
): Promise<DeleteProjectResult> {
  const session = await requirePageSession();
  const parsed = deleteProjectSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid request" };

  try {
    await db
      .delete(labelProject)
      .where(
        and(
          eq(labelProject.id, parsed.data.projectId),
          eq(labelProject.userId, session.user.id),
        ),
      );
  } catch (error) {
    console.error("Failed to delete label project", error);
    return { ok: false, error: "Failed to delete project" };
  }

  revalidatePath("/auto-label");
  return { ok: true };
}

// ─── Start job ────────────────────────────────────────────────────────────────

const startProjectSchema = z.object({ projectId: z.string().min(1) });

type StartProjectResult =
  | { ok: true; project: LabelProject }
  | { ok: false; error: string };

export async function startLabelProjectAction(
  input: z.input<typeof startProjectSchema>,
): Promise<StartProjectResult> {
  const session = await requirePageSession();
  const parsed = startProjectSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const [project] = await db
    .select()
    .from(labelProject)
    .where(
      and(
        eq(labelProject.id, parsed.data.projectId),
        eq(labelProject.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!project) return { ok: false, error: "Project not found" };
  if (project.totalImages === 0) return { ok: false, error: "No images uploaded" };
  if (!["draft", "ready"].includes(project.status)) {
    return { ok: false, error: "Project is already running or completed" };
  }

  await db
    .update(labelProject)
    .set({ status: "processing" })
    .where(eq(labelProject.id, project.id));

  const updatedProject = { ...project, status: "processing" as const };

  revalidatePath(`/auto-label/${project.id}`);

  after(async () => {
    try {
      await runLabelProjectProcessing({
        projectId: project.id,
        userId: session.user.id,
      });
    } catch (err) {
      console.error("Failed to trigger background processor", err);
    }
  });

  return { ok: true, project: updatedProject };
}
