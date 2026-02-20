import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@segmentation/db";
import { labelImage, labelProject } from "@segmentation/db/schema/app";
import { and, eq, sql } from "drizzle-orm";

import { requireRouteUser } from "@/lib/server/route-auth";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const uploadPayloadSchema = z.object({
  projectId: z.string().min(1),
  contentType: z.string().optional(),
});

function extractErrorMessage(status: number, body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string" && body.error) return body.error;
    if ("message" in body && typeof body.message === "string" && body.message) return body.message;
  }
  if (status === 401) return "Invalid API key";
  return fallback;
}

export async function POST(request: Request) {
  const routeUser = await requireRouteUser(request);
  if (!routeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("imageFile");
  const parsed = uploadPayloadSchema.safeParse({
    projectId: formData.get("projectId"),
    contentType: formData.get("contentType"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  if (!(imageFile instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  const contentType = parsed.data.contentType || imageFile.type || "image/png";

  if (!ACCEPTED_MIME_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, GIF, or AVIF." },
      { status: 400 },
    );
  }

  if (imageFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
  }

  // Load project — this gives us the stored API key
  const [project] = await db
    .select({
      id: labelProject.id,
      status: labelProject.status,
      apiKeyPlaintext: labelProject.apiKeyPlaintext,
    })
    .from(labelProject)
    .where(and(eq(labelProject.id, parsed.data.projectId), eq(labelProject.userId, routeUser.userId)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!["draft", "ready"].includes(project.status)) {
    return NextResponse.json(
      { error: "Cannot upload images to a project that is already processing or completed" },
      { status: 409 },
    );
  }

  try {
    const presignResponse = await fetch("https://api.segmentationapi.com/v1/uploads/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": project.apiKeyPlaintext,
      },
      body: JSON.stringify({ contentType }),
    });
    const presignBody = await presignResponse.json().catch(() => ({}));

    if (!presignResponse.ok) {
      return NextResponse.json(
        {
          error: extractErrorMessage(
            presignResponse.status,
            presignBody,
            `Failed to create upload URL (${presignResponse.status})`,
          ),
        },
        { status: presignResponse.status },
      );
    }

    if (typeof presignBody?.uploadUrl !== "string" || typeof presignBody?.s3Key !== "string") {
      return NextResponse.json({ error: "Upload response missing upload URL or key" }, { status: 502 });
    }

    const s3Response = await fetch(presignBody.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: await imageFile.arrayBuffer(),
    });

    if (!s3Response.ok) {
      return NextResponse.json(
        { error: `Failed to upload image (${s3Response.status})` },
        { status: 502 },
      );
    }

    const imageId = `li_${crypto.randomUUID()}`;
    await db.insert(labelImage).values({
      id: imageId,
      projectId: project.id,
      s3Key: presignBody.s3Key,
      originalName: imageFile.name,
      fileSizeBytes: imageFile.size,
      imageStatus: "pending",
    });

    await db
      .update(labelProject)
      .set({ totalImages: sql`${labelProject.totalImages} + 1`, status: "ready" })
      .where(eq(labelProject.id, project.id));

    return NextResponse.json({ imageId, s3Key: presignBody.s3Key });
  } catch (error) {
    console.error("Auto-label upload failed", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
