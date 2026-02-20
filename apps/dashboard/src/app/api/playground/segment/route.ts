import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRouteUser } from "@/lib/server/route-auth";

const segmentPayloadSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required"),
  inputS3Key: z.string().trim().min(1, "inputS3Key is required"),
  mask_threshold: z.number().min(0).max(1).default(0.5),
  prompt: z.string().default(""),
  threshold: z.number().min(0).max(1).default(0.5),
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

  const body = await request.json().catch(() => null);
  const parsedBody = segmentPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid segmentation request body" }, { status: 400 });
  }

  try {
    const upstreamResponse = await fetch("https://api.segmentationapi.com/v1/segment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": parsedBody.data.apiKey,
      },
      body: JSON.stringify({
        inputS3Key: parsedBody.data.inputS3Key,
        mask_threshold: parsedBody.data.mask_threshold,
        prompt: parsedBody.data.prompt,
        threshold: parsedBody.data.threshold,
      }),
    });
    const upstreamBody = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: extractErrorMessage(
            upstreamResponse.status,
            upstreamBody,
            `Segmentation failed (${upstreamResponse.status})`,
          ),
        },
        {
          status: upstreamResponse.status,
        },
      );
    }

    return NextResponse.json(upstreamBody);
  } catch (error) {
    console.error("Playground segmentation proxy failed", error);
    return NextResponse.json({ error: "Failed to run segmentation" }, { status: 500 });
  }
}
