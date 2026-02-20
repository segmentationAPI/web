import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRouteUser } from "@/lib/server/route-auth";

const uploadPayloadSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required"),
  contentType: z.string().trim().optional(),
});

function extractErrorMessage(status: number, body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string" &&
    body.error.trim()
  ) {
    return body.error;
  }

  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message;
  }

  if (status === 401) {
    return "Invalid API key";
  }

  return fallback;
}

export async function POST(request: Request) {
  const routeUser = await requireRouteUser(request);

  if (!routeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("imageFile");
  const parsedPayload = uploadPayloadSchema.safeParse({
    apiKey: formData.get("apiKey"),
    contentType: formData.get("contentType"),
  });

  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid upload request body" }, { status: 400 });
  }

  if (!(imageFile instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  const fileContentType = parsedPayload.data.contentType || imageFile.type || "image/png";

  if (!fileContentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
  }

  try {
    const presignResponse = await fetch("https://api.segmentationapi.com/v1/uploads/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": parsedPayload.data.apiKey,
      },
      body: JSON.stringify({
        contentType: fileContentType,
      }),
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
        {
          status: presignResponse.status,
        },
      );
    }

    if (
      !presignBody ||
      typeof presignBody !== "object" ||
      !("uploadUrl" in presignBody) ||
      typeof presignBody.uploadUrl !== "string" ||
      !("s3Key" in presignBody) ||
      typeof presignBody.s3Key !== "string"
    ) {
      return NextResponse.json({ error: "Upload response missing upload URL or key" }, { status: 502 });
    }

    const uploadToS3Response = await fetch(presignBody.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileContentType,
      },
      body: await imageFile.arrayBuffer(),
    });

    if (!uploadToS3Response.ok) {
      return NextResponse.json(
        {
          error: `Failed to upload image (${uploadToS3Response.status})`,
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      s3Key: presignBody.s3Key,
    });
  } catch (error) {
    console.error("Playground upload proxy failed", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
