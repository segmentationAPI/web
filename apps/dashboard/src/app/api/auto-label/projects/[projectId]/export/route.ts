import { db } from "@segmentation/db";
import { autoLabelProject, image, job, jobOutputMask } from "@segmentation/db/schema/app";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import archiver from "archiver";

import { requirePageSession } from "@/lib/server/page-auth";
import { buildAssetUrl } from "@/lib/server/aws/s3";

// ── Types ──────────────────────────────────────────────────────────────────────

type MaskEntry = {
    s3Path: string;
    maskIndex: number;
    score: number | null;
    box: [number, number, number, number] | null;
};

type ExportItem = {
    fileName: string;
    imageWidth: number | null;
    imageHeight: number | null;
    masks: MaskEntry[];
};

type ExportFormat = "png" | "yolo" | "labelstudio";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fileNameFromS3Path(s3Path: string): string {
    return s3Path.split("/").pop() ?? s3Path;
}

function fileBaseName(fileName: string): string {
    const parts = fileName.split(".");
    if (parts.length > 1) parts.pop();
    return parts.join(".");
}

function readableFromArchiver(archive: archiver.Archiver): ReadableStream {
    let isCancelled = false;
    return new ReadableStream({
        start(controller) {
            archive.on("data", (chunk) => { if (!isCancelled) controller.enqueue(chunk); });
            archive.on("end", () => { if (!isCancelled) controller.close(); });
            archive.on("error", (err) => { if (!isCancelled) controller.error(err); });
        },
        cancel() { isCancelled = true; archive.abort(); },
    });
}

async function fetchMaskBuffer(s3Path: string): Promise<Buffer | null> {
    const url = buildAssetUrl(s3Path);
    if (!url) return null;
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
    } catch {
        return null;
    }
}

// ── Format builders ────────────────────────────────────────────────────────────

async function addPngFormat(archive: archiver.Archiver, items: ExportItem[]) {
    for (const item of items) {
        if (item.masks.length === 0) continue;
        const base = fileBaseName(item.fileName);

        for (const mask of item.masks) {
            const buf = await fetchMaskBuffer(mask.s3Path);
            if (!buf) continue;
            const entryName = item.masks.length > 1
                ? `masks/${base}/mask_${mask.maskIndex}.png`
                : `masks/${base}/mask.png`;
            archive.append(buf, { name: entryName });
        }
    }
}

function addYoloFormat(archive: archiver.Archiver, items: ExportItem[], prompts: string[]) {
    const names = prompts.length > 0 ? prompts : ["object"];
    const classesContent = names.map((name, i) => `${i} ${name}`).join("\n");
    archive.append(classesContent, { name: "yolo/classes.txt" });

    const dataYaml = `nc: ${names.length}\nnames: [${names.map(n => `'${n}'`).join(", ")}]\n# Add your train/val paths below\n# train: images/train\n# val: images/val\n`;
    archive.append(dataYaml, { name: "yolo/data.yaml" });

    for (const item of items) {
        if (item.masks.length === 0) continue;
        const { imageWidth: W, imageHeight: H } = item;
        if (!W || !H) continue;

        const base = fileBaseName(item.fileName);
        const lines: string[] = [];

        for (const mask of item.masks) {
            const box = mask.box;
            if (!box) continue;

            const [x1, y1, x2, y2] = box;
            const cx = ((x1 + x2) / 2) / W;
            const cy = ((y1 + y2) / 2) / H;
            const bw = (x2 - x1) / W;
            const bh = (y2 - y1) / H;

            const fmt = (v: number) => Math.max(0, Math.min(1, v)).toFixed(6);
            lines.push(`0 ${fmt(cx)} ${fmt(cy)} ${fmt(bw)} ${fmt(bh)}`);
        }

        if (lines.length > 0) {
            archive.append(lines.join("\n"), { name: `yolo/labels/${base}.txt` });
        }
    }
}

function addLabelStudioFormat(archive: archiver.Archiver, items: ExportItem[], prompts: string[]) {
    const labels = prompts.length > 0 ? prompts : ["object"];
    const tasks: object[] = [];

    for (const item of items) {
        const results: object[] = [];
        const W = item.imageWidth ?? 1;
        const H = item.imageHeight ?? 1;

        for (const mask of item.masks) {
            const box = mask.box;
            if (!box) continue;

            const [x1, y1, x2, y2] = box;
            results.push({
                id: `mask_${mask.maskIndex}`,
                type: "rectanglelabels",
                from_name: "label",
                to_name: "image",
                value: {
                    x: (x1 / W) * 100,
                    y: (y1 / H) * 100,
                    width: ((x2 - x1) / W) * 100,
                    height: ((y2 - y1) / H) * 100,
                    rotation: 0,
                    rectanglelabels: labels,
                },
                score: mask.score ?? null,
            });
        }

        if (results.length > 0) {
            tasks.push({
                data: { image: item.fileName },
                annotations: [{ result: results }],
            });
        }
    }

    archive.append(JSON.stringify(tasks, null, 2), { name: "label_studio_tasks.json" });
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> },
) {
    const session = await requirePageSession().catch(() => null);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { projectId } = await params;

    const url = new URL(request.url);
    const rawFormats = url.searchParams.get("formats") ?? "png";
    const formats = rawFormats
        .split(",")
        .map((f) => f.trim().toLowerCase())
        .filter((f): f is ExportFormat => ["png", "yolo", "labelstudio"].includes(f));

    if (formats.length === 0) {
        return new NextResponse("No valid export format specified", { status: 400 });
    }

    const [project] = await db
        .select({
            latestBatchJobId: autoLabelProject.latestBatchJobId,
            name: autoLabelProject.name,
            prompts: autoLabelProject.prompts,
        })
        .from(autoLabelProject)
        .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
        .limit(1);

    if (!project) return new NextResponse("Project not found", { status: 404 });
    if (!project.latestBatchJobId) return new NextResponse("No segmentation job has been run yet", { status: 400 });

    const successfulJobs = await db
        .select({
            jobId: job.id,
            s3Path: image.s3Path,
            width: image.width,
            height: image.height,
        })
        .from(job)
        .innerJoin(image, eq(job.inputImageId, image.id))
        .where(
            and(
                eq(job.batchJobId, project.latestBatchJobId),
                eq(job.userId, session.user.id),
                eq(job.status, "success"),
            ),
        );

    if (successfulJobs.length === 0) {
        return new NextResponse("No completed masks available for export", { status: 404 });
    }

    const jobIds = successfulJobs.map((j) => j.jobId);
    const masks = await db
        .select()
        .from(jobOutputMask)
        .where(inArray(jobOutputMask.jobId, jobIds))
        .orderBy(jobOutputMask.maskIndex);

    const masksByJob = new Map<string, MaskEntry[]>();
    for (const m of masks) {
        const entry: MaskEntry = {
            s3Path: m.s3Path,
            maskIndex: m.maskIndex,
            score: m.score,
            box: m.box,
        };
        const existing = masksByJob.get(m.jobId);
        if (existing) {
            existing.push(entry);
        } else {
            masksByJob.set(m.jobId, [entry]);
        }
    }

    const items: ExportItem[] = successfulJobs.map((j) => ({
        fileName: fileNameFromS3Path(j.s3Path),
        imageWidth: j.width,
        imageHeight: j.height,
        masks: masksByJob.get(j.jobId) ?? [],
    }));

    const archive = archiver("zip", { zlib: { level: 5 } });
    const readable = readableFromArchiver(archive);

    const processExport = async () => {
        try {
            if (formats.includes("png")) await addPngFormat(archive, items);
            if (formats.includes("yolo")) addYoloFormat(archive, items, project.prompts ?? []);
            if (formats.includes("labelstudio")) addLabelStudioFormat(archive, items, project.prompts ?? []);
        } finally {
            archive.finalize();
        }
    };

    processExport();

    const formatLabel = formats.length === 1 ? formats[0] : "multi";
    return new NextResponse(readable, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="masks_${formatLabel}.zip"`,
        },
    });
}
