import { db } from "@segmentation/db";
import { labelImage, labelProject, type LabelProject } from "@segmentation/db/schema/app";
import { and, eq, sql } from "drizzle-orm";

type RunLabelProjectProcessingInput = {
  projectId: string;
  userId: string;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string" && body.error) return body.error;
    if ("message" in body && typeof body.message === "string" && body.message) return body.message;
  }
  return fallback;
}

export async function runLabelProjectProcessing({
  projectId,
  userId,
}: RunLabelProjectProcessingInput) {
  const [project] = await db
    .select()
    .from(labelProject)
    .where(and(eq(labelProject.id, projectId), eq(labelProject.userId, userId)))
    .limit(1);

  if (!project || project.status !== "processing") {
    console.error("[process] Project not found or wrong status:", projectId, project?.status);
    return;
  }

  if (!project.apiKeyPlaintext) {
    console.error("[process] Missing API key for project:", project.id);
    await db
      .update(labelProject)
      .set({ status: "failed" })
      .where(eq(labelProject.id, project.id));
    return;
  }

  await runProcessing({
    project,
    apiKeyPlaintext: project.apiKeyPlaintext,
  });
}

async function runProcessing({
  project,
  apiKeyPlaintext,
}: {
  project: LabelProject;
  apiKeyPlaintext: string;
}) {
  const projectId = project.id;

  const images = await db
    .select()
    .from(labelImage)
    .where(and(eq(labelImage.projectId, projectId), eq(labelImage.imageStatus, "pending")));

  type SegResult = { imageName: string; s3Key: string; masks: unknown[]; success: boolean };
  const segmentationResults: SegResult[] = [];

  for (const image of images) {
    await db
      .update(labelImage)
      .set({ imageStatus: "processing" })
      .where(eq(labelImage.id, image.id));

    try {
      const response = await fetch("https://api.segmentationapi.com/v1/segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeyPlaintext,
        },
        body: JSON.stringify({
          inputS3Key: image.s3Key,
          prompt: project.prompt,
          threshold: 0.5,
          mask_threshold: 0.5,
        }),
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = extractErrorMessage(
          responseBody,
          `Segmentation failed (${response.status})`,
        );
        await db
          .update(labelImage)
          .set({ imageStatus: "failed", errorMessage })
          .where(eq(labelImage.id, image.id));
        await db
          .update(labelProject)
          .set({ failedImages: sql`${labelProject.failedImages} + 1` })
          .where(eq(labelProject.id, projectId));
        continue;
      }

      const requestId =
        typeof responseBody?.requestId === "string" ? responseBody.requestId : null;
      const masks = Array.isArray(responseBody?.masks) ? responseBody.masks : [];

      await db
        .update(labelImage)
        .set({ imageStatus: "done", requestId })
        .where(eq(labelImage.id, image.id));
      await db
        .update(labelProject)
        .set({ processedImages: sql`${labelProject.processedImages} + 1` })
        .where(eq(labelProject.id, projectId));

      segmentationResults.push({
        imageName: image.originalName,
        s3Key: image.s3Key,
        masks,
        success: true,
      });
    } catch (error) {
      console.error(`Failed to segment image ${image.id}`, error);
      await db
        .update(labelImage)
        .set({ imageStatus: "failed", errorMessage: "Unexpected processing error" })
        .where(eq(labelImage.id, image.id));
      await db
        .update(labelProject)
        .set({ failedImages: sql`${labelProject.failedImages} + 1` })
        .where(eq(labelProject.id, projectId));
    }
  }

  try {
    const manifest = {
      projectId: project.id,
      prompt: project.prompt,
      formats: [
        ...(project.outputCoco ? ["coco"] : []),
        ...(project.outputClassPngs ? ["class_pngs"] : []),
        ...(project.outputYolo ? ["yolo"] : []),
      ],
      images: segmentationResults
        .filter((result) => result.success)
        .map((result) => ({ name: result.imageName, s3Key: result.s3Key, masks: result.masks })),
      generatedAt: new Date().toISOString(),
    };

    const presignResponse = await fetch("https://api.segmentationapi.com/v1/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKeyPlaintext },
      body: JSON.stringify({ contentType: "application/json" }),
    });

    if (!presignResponse.ok) {
      throw new Error(`Failed to create manifest upload URL (${presignResponse.status})`);
    }

    const presignBody = await presignResponse.json().catch(() => ({}));

    if (typeof presignBody?.uploadUrl !== "string" || typeof presignBody?.s3Key !== "string") {
      throw new Error("Manifest upload response missing uploadUrl or s3Key");
    }

    const uploadResponse = await fetch(presignBody.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manifest),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload manifest (${uploadResponse.status})`);
    }

    await db
      .update(labelProject)
      .set({ status: "completed", resultKey: presignBody.s3Key })
      .where(eq(labelProject.id, projectId));
  } catch (error) {
    console.error("Result assembly failed", error);
    await db
      .update(labelProject)
      .set({ status: "failed" })
      .where(eq(labelProject.id, projectId));
  }
}
