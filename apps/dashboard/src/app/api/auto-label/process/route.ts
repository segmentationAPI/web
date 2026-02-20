import { NextResponse, after } from "next/server";
import { z } from "zod";
import { runLabelProjectProcessing } from "@/lib/server/auto-label/processor";

const processPayloadSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = processPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error("[process] Invalid request body:", parsed.error.flatten());
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { projectId, userId } = parsed.data;

  // Respond immediately, do the work in after() so the response isn't held open
  after(async () => {
    await runLabelProjectProcessing({ projectId, userId });
  });

  return NextResponse.json({ ok: true, queued: true });
}
