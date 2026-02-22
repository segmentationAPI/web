import { db } from "@segmentation/db";
import { autoLabelProject, autoLabelProjectImage, requestBatchItem } from "@segmentation/db/schema/app";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import archiver from "archiver";

import { requirePageSession } from "@/lib/server/page-auth";
import { buildAssetUrlByKey } from "@/lib/server/aws/s3";

// ── Types ──────────────────────────────────────────────────────────────────────

type MaskMeta = { key: string; score: number | null; box: [number, number, number, number] | null };

type ExportItem = {
    fileName: string;
    imageWidth: number | null;
    imageHeight: number | null;
    outputPrefix: string | null;
    outputCount: number;
    masks: MaskMeta[];
};

type ExportFormat = "png" | "yolo" | "labelstudio";

// ── Stream helper ──────────────────────────────────────────────────────────────

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

// ── Fetch mask buffer from CDN ─────────────────────────────────────────────────

async function fetchMaskBuffer(s3Key: string): Promise<Buffer | null> {
    const url = buildAssetUrlByKey(s3Key);
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
        if (!item.outputPrefix || item.outputCount === 0) continue;
        const nameParts = item.fileName.split(".");
        nameParts.pop();
        const base = nameParts.join(".");

        for (let i = 0; i < item.outputCount; i++) {
            const s3Key = `${item.outputPrefix.replace(/\/+$/, "")}/mask_${i}.png`;
            const buf = await fetchMaskBuffer(s3Key);
            if (!buf) continue;
            const entryName = item.outputCount > 1
                ? `masks/${base}/mask_${i}.png`
                : `masks/${base}/mask.png`;
            archive.append(buf, { name: entryName });
        }
    }
}

function addYoloFormat(archive: archiver.Archiver, items: ExportItem[], prompt: string) {
    const classesContent = `0 ${prompt || "object"}`;
    archive.append(classesContent, { name: "yolo/classes.txt" });

    // data.yaml for convenience
    const dataYaml = `nc: 1\nnames: ['${prompt || "object"}']\n# Add your train/val paths below\n# train: images/train\n# val: images/val\n`;
    archive.append(dataYaml, { name: "yolo/data.yaml" });

    for (const item of items) {
        if (!item.outputPrefix || item.outputCount === 0) continue;
        const { imageWidth: W, imageHeight: H } = item;
        if (!W || !H) continue;

        const nameParts = item.fileName.split(".");
        const ext = nameParts.pop();
        const base = nameParts.join(".");

        const lines: string[] = [];

        for (let i = 0; i < item.outputCount; i++) {
            const maskMeta = item.masks[i] ?? null;
            const box = maskMeta?.box ?? null;
            if (!box) continue;

            const [x1, y1, x2, y2] = box;
            const cx = ((x1 + x2) / 2) / W;
            const cy = ((y1 + y2) / 2) / H;
            const bw = (x2 - x1) / W;
            const bh = (y2 - y1) / H;

            // Clamp to [0,1]
            const fmt = (v: number) => Math.max(0, Math.min(1, v)).toFixed(6);
            lines.push(`0 ${fmt(cx)} ${fmt(cy)} ${fmt(bw)} ${fmt(bh)}`);
        }

        if (lines.length > 0) {
            archive.append(lines.join("\n"), { name: `yolo/labels/${base}.txt` });
        }

        void ext; // suppress unused warning
    }
}

function addLabelStudioFormat(archive: archiver.Archiver, items: ExportItem[], prompt: string) {
    const tasks: object[] = [];

    for (const item of items) {
        const results: object[] = [];

        for (let i = 0; i < item.outputCount; i++) {
            const maskMeta = item.masks[i] ?? null;
            const box = maskMeta?.box ?? null;
            const W = item.imageWidth ?? 1;
            const H = item.imageHeight ?? 1;

            if (box) {
                const [x1, y1, x2, y2] = box;
                results.push({
                    id: `mask_${i}`,
                    type: "rectanglelabels",
                    from_name: "label",
                    to_name: "image",
                    value: {
                        x: (x1 / W) * 100,
                        y: (y1 / H) * 100,
                        width: ((x2 - x1) / W) * 100,
                        height: ((y2 - y1) / H) * 100,
                        rotation: 0,
                        rectanglelabels: [prompt || "object"],
                    },
                    score: maskMeta?.score ?? null,
                });
            }
        }

        if (results.length > 0) {
            tasks.push({
                data: {
                    image: item.fileName,
                },
                annotations: [
                    {
                        result: results,
                    },
                ],
            });
        }
    }

    archive.append(JSON.stringify(tasks, null, 2), { name: "label_studio_tasks.json" });
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await requirePageSession().catch(() => null);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { projectId } = await params;

    // Parse formats
    const url = new URL(request.url);
    const rawFormats = url.searchParams.get("formats") ?? "png";
    const formats = rawFormats
        .split(",")
        .map((f) => f.trim().toLowerCase())
        .filter((f): f is ExportFormat => ["png", "yolo", "labelstudio"].includes(f));

    if (formats.length === 0) {
        return new NextResponse("No valid export format specified", { status: 400 });
    }

    // Verify project ownership
    const [project] = await db
        .select({
            latestBatchJobId: autoLabelProject.latestBatchJobId,
            name: autoLabelProject.name,
            prompt: autoLabelProject.prompt,
        })
        .from(autoLabelProject)
        .where(and(eq(autoLabelProject.userId, session.user.id), eq(autoLabelProject.id, projectId)))
        .limit(1);

    if (!project) return new NextResponse("Project not found", { status: 404 });
    if (!project.latestBatchJobId) return new NextResponse("No segmentation job has been run yet", { status: 400 });

    // Fetch batch items + image metadata
    const rows = await db
        .select({
            outputPrefix: requestBatchItem.outputPrefix,
            outputCount: requestBatchItem.outputCount,
            masksJson: requestBatchItem.masksJson,
            fileName: autoLabelProjectImage.fileName,
            imageWidth: autoLabelProjectImage.imageWidth,
            imageHeight: autoLabelProjectImage.imageHeight,
        })
        .from(requestBatchItem)
        .innerJoin(
            autoLabelProjectImage,
            and(
                eq(requestBatchItem.inputS3Key, autoLabelProjectImage.inputS3Key),
                eq(autoLabelProjectImage.projectId, projectId)
            )
        )
        .where(
            and(
                eq(requestBatchItem.jobId, project.latestBatchJobId),
                eq(requestBatchItem.userId, session.user.id),
                eq(requestBatchItem.status, "success")
            )
        );

    if (rows.length === 0) return new NextResponse("No completed masks available for export", { status: 404 });

    // Normalize items
    const items: ExportItem[] = rows.map((row) => {
        let masks: MaskMeta[] = [];
        if (Array.isArray(row.masksJson)) {
            masks = (row.masksJson as unknown[]).map((m: unknown) => {
                const mm = m as Record<string, unknown>;
                return {
                    key: String(mm.key ?? ""),
                    score: mm.score != null ? Number(mm.score) : null,
                    box: Array.isArray(mm.box) && mm.box.length === 4
                        ? (mm.box as [number, number, number, number])
                        : null,
                };
            });
        }
        return {
            fileName: row.fileName,
            imageWidth: row.imageWidth ?? null,
            imageHeight: row.imageHeight ?? null,
            outputPrefix: row.outputPrefix ?? null,
            outputCount: row.outputCount ?? 0,
            masks,
        };
    });

    // Build archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const readable = readableFromArchiver(archive);

    const processExport = async () => {
        try {
            if (formats.includes("png")) await addPngFormat(archive, items);

            if (formats.includes("yolo")) addYoloFormat(archive, items, project.prompt ?? "");
            if (formats.includes("labelstudio")) addLabelStudioFormat(archive, items, project.prompt ?? "");
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
