"use client";

import { ChevronDown, Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatNumber } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BalanceData } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import type { ApiKey } from "@segmentation/db/schema/app";

const MASK_OVERLAY_COLORS = ["#ff703f", "#39d5c9", "#f2b77a", "#74e8a5", "#f95f8e", "#ffeecc"];

function buildMaskTintStyle(maskUrl: string, color: string) {
  return {
    backgroundBlendMode: "multiply",
    backgroundImage: `linear-gradient(${color}, ${color}), url("${maskUrl}")`,
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundSize: "100% 100%, 100% 100%",
    mixBlendMode: "screen" as const,
    opacity: 0.7,
  };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

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

type SegmentMask = {
  box?: number[];
  key: string;
  score?: number;
};

type SegmentResult = {
  job_id?: string;
  masks: SegmentMask[];
  num_instances?: number;
  output_prefix?: string;
  requestId?: string;
};

type Props = {
  balance: BalanceData;
  cloudfrontBaseUrl: string;
  initialApiKeys: ApiKey[];
};

export function PlaygroundPageContent({ balance, cloudfrontBaseUrl, initialApiKeys }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [maskThreshold, setMaskThreshold] = useState(0.5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "segmenting" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeKeyCount = useMemo(
    () => initialApiKeys.filter((key) => !key.revoked).length,
    [initialApiKeys],
  );
  const canSubmit =
    imageFile !== null &&
    apiKey.trim().length > 0 &&
    status !== "uploading" &&
    status !== "segmenting";

  function buildMaskUrl(maskKey: string): string {
    return `${cloudfrontBaseUrl}/${maskKey.replace(/^\/+/, "")}`;
  }

  function handleFileSelect(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setResult(null);
      setErrorMessage("Please select an image file.");
      return;
    }

    setImageFile(file);
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
    setImagePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });
  }

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  async function runSegmentation() {
    if (!canSubmit || !imageFile) {
      return;
    }

    const normalizedApiKey = apiKey.trim();

    setStatus("uploading");
    setResult(null);
    setErrorMessage(null);
    const contentType = imageFile.type || "image/png";

    try {
      const uploadForm = new FormData();
      uploadForm.set("apiKey", normalizedApiKey);
      uploadForm.set("imageFile", imageFile);
      uploadForm.set("contentType", contentType);

      const uploadResponse = await fetch("/api/playground/upload", {
        method: "POST",
        body: uploadForm,
      });
      const uploadBody = await uploadResponse.json().catch(() => ({}));

      if (!uploadResponse.ok) {
        throw new Error(
          extractErrorMessage(
            uploadResponse.status,
            uploadBody,
            `Failed to upload image (${uploadResponse.status})`,
          ),
        );
      }

      if (
        !uploadBody ||
        typeof uploadBody !== "object" ||
        !("s3Key" in uploadBody) ||
        typeof uploadBody.s3Key !== "string"
      ) {
        throw new Error("Upload response did not include s3Key");
      }

      setStatus("segmenting");

      const segmentResponse = await fetch("/api/playground/segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: normalizedApiKey,
          inputS3Key: uploadBody.s3Key,
          mask_threshold: maskThreshold,
          prompt,
          threshold,
        }),
      });
      const segmentBody = await segmentResponse.json().catch(() => ({}));

      if (!segmentResponse.ok) {
        throw new Error(
          extractErrorMessage(
            segmentResponse.status,
            segmentBody,
            `Segmentation failed (${segmentResponse.status})`,
          ),
        );
      }

      const parsedResult: SegmentResult = {
        job_id:
          segmentBody &&
          typeof segmentBody === "object" &&
          "job_id" in segmentBody &&
          typeof segmentBody.job_id === "string"
            ? segmentBody.job_id
            : undefined,
        masks:
          segmentBody &&
          typeof segmentBody === "object" &&
          "masks" in segmentBody &&
          Array.isArray(segmentBody.masks)
            ? segmentBody.masks.filter(
                (mask: unknown): mask is SegmentMask =>
                  !!mask && typeof mask === "object" && "key" in mask && typeof mask.key === "string",
              )
            : [],
        num_instances:
          segmentBody &&
          typeof segmentBody === "object" &&
          "num_instances" in segmentBody &&
          typeof segmentBody.num_instances === "number"
            ? segmentBody.num_instances
            : undefined,
        output_prefix:
          segmentBody &&
          typeof segmentBody === "object" &&
          "output_prefix" in segmentBody &&
          typeof segmentBody.output_prefix === "string"
            ? segmentBody.output_prefix
            : undefined,
        requestId:
          segmentBody &&
          typeof segmentBody === "object" &&
          "requestId" in segmentBody &&
          typeof segmentBody.requestId === "string"
            ? segmentBody.requestId
            : undefined,
      };

      setResult(parsedResult);
      setStatus("done");
    } catch (error) {
      console.error(error);
      setResult(null);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to run segmentation");
    }
  }

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Interactive Playground
        </CardDescription>
        <CardTitle className="font-display tracking-[0.03em] text-foreground">
          Live Segmentation
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(20rem,1fr)_minmax(24rem,1.2fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/55 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Tokens Remaining
              </div>
              <div className="mt-2 font-display text-3xl text-secondary">
                {formatNumber(balance.tokensRemaining)}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/55 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Last 24h Usage
              </div>
              <div className="mt-2 font-display text-3xl text-primary">
                {formatNumber(balance.tokenUsageLast24h)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="playground-api-key"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              API Key
            </label>
            <Input
              id="playground-api-key"
              type="password"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="border-input bg-background/60"
            />
            <p className="text-xs text-muted-foreground">
              {activeKeyCount} active keys on this account. You can paste any valid API key, or copy from{" "}
              <Link href="/api-keys" className="text-primary underline underline-offset-4">
                API Keys
              </Link>
              .
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="playground-prompt"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Prompt
            </label>
            <Input
              id="playground-prompt"
              placeholder="person"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="border-input bg-background/60"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/35 p-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Advanced
              <ChevronDown
                className={cn("size-4 transition-transform", showAdvanced ? "rotate-180" : "")}
              />
            </button>
            {showAdvanced ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="playground-threshold"
                    className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    threshold: {threshold.toFixed(2)}
                  </label>
                  <input
                    id="playground-threshold"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={threshold}
                    onChange={(event) => setThreshold(Number(event.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="playground-mask-threshold"
                    className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    mask_threshold: {maskThreshold.toFixed(2)}
                  </label>
                  <input
                    id="playground-mask-threshold"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maskThreshold}
                    onChange={(event) => setMaskThreshold(Number(event.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                handleFileSelect(event.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                "cursor-pointer rounded-xl border border-dashed border-border/70 bg-background/45 p-4 transition-colors",
                isDragOver ? "border-secondary/70 bg-secondary/12" : "hover:border-primary/60",
              )}
            >
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Drag image here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, or AVIF</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                handleFileSelect(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />

            {imagePreviewUrl && imageFile ? (
              <div className="rounded-lg border border-border/70 bg-background/55 p-2">
                <div className="overflow-hidden rounded-md border border-border/60 bg-card/70">
                  <Image
                    src={imagePreviewUrl}
                    alt={imageFile.name || "Uploaded image preview"}
                    width={640}
                    height={360}
                    className="h-auto w-full object-contain"
                    unoptimized
                  />
                </div>
                <p className="mt-2 truncate font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {imageFile.name} · {formatFileSize(imageFile.size)}
                </p>
              </div>
            ) : null}
          </div>

          <Button
            onClick={() => void runSegmentation()}
            disabled={!canSubmit}
            className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
          >
            {status === "uploading" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Uploading image...
              </>
            ) : status === "segmenting" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Running segmentation...
              </>
            ) : (
              "Run Segmentation"
            )}
          </Button>
        </div>

        <section className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Result
          </h2>

          {status === "uploading" || status === "segmenting" ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-border/70 bg-muted/45 p-6 text-center">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {status === "uploading" ? "Uploading image..." : "Running segmentation..."}
              </p>
            </div>
          ) : status === "error" ? (
            <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-xs text-destructive">
              <p className="font-mono uppercase tracking-[0.14em]">Request failed</p>
              <p className="mt-1">{errorMessage || "Failed to run segmentation."}</p>
            </div>
          ) : result && imagePreviewUrl ? (
            <>
              <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
                <Image
                  src={imagePreviewUrl}
                  alt="Input image with segmentation overlays"
                  className="block h-auto w-full object-contain"
                  width={960}
                  height={640}
                  unoptimized
                />
                {result.masks.map((mask, index) => (
                  <div
                    key={`${mask.key}-${index}`}
                    className="pointer-events-none absolute inset-0"
                    style={buildMaskTintStyle(
                      buildMaskUrl(mask.key),
                      MASK_OVERLAY_COLORS[index % MASK_OVERLAY_COLORS.length],
                    )}
                  />
                ))}
              </div>

              <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/55 p-3 text-xs text-foreground sm:grid-cols-2">
                <div>
                  <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    Request ID
                  </span>
                  <p className="mt-1 break-all">{result.requestId || "--"}</p>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    Job ID
                  </span>
                  <p className="mt-1 break-all">{result.job_id || "--"}</p>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    Num Instances
                  </span>
                  <p className="mt-1">{result.num_instances ?? result.masks.length}</p>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    Output Prefix
                  </span>
                  <p className="mt-1 break-all">{result.output_prefix || "--"}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 bg-muted/45 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Mask Scores
                </p>
                {result.masks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No masks returned.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {result.masks.map((mask, index) => (
                      <li key={`score-${mask.key}-${index}`} className="rounded-md border border-border/70 p-2">
                        <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          Mask {index + 1}
                        </p>
                        <p className="mt-1 text-foreground">
                          Confidence:{" "}
                          {typeof mask.score === "number" ? mask.score.toFixed(4) : "Unavailable"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-border/70 bg-muted/45 p-6 text-center">
              <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Upload an image and run segmentation to see live overlays.
              </p>
            </div>
          )}

          {status === "done" && result && result.masks.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-muted/45 p-3 text-xs text-muted-foreground">
              API response completed, but no masks were returned for this prompt/threshold.
            </div>
          ) : null}

          {status === "idle" && !imageFile ? (
            <div className="rounded-lg border border-border/70 bg-muted/45 p-3 text-xs text-muted-foreground">
              You can test with prompts like <span className="font-mono text-foreground">person</span>,{" "}
              <span className="font-mono text-foreground">car</span>, or{" "}
              <span className="font-mono text-foreground">dog</span>.
            </div>
          ) : null}

        </section>
      </CardContent>
    </Card>
  );
}
