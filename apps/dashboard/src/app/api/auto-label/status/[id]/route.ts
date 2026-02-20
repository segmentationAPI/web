import { NextResponse } from "next/server";
import { db } from "@segmentation/db";
import { labelProject } from "@segmentation/db/schema/app";
import { and, eq } from "drizzle-orm";

import { requireRouteUser } from "@/lib/server/route-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const routeUser = await requireRouteUser(request);
  if (!routeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [project] = await db
    .select({
      status: labelProject.status,
      totalImages: labelProject.totalImages,
      processedImages: labelProject.processedImages,
      failedImages: labelProject.failedImages,
      resultKey: labelProject.resultKey,
    })
    .from(labelProject)
    .where(and(eq(labelProject.id, id), eq(labelProject.userId, routeUser.userId)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
