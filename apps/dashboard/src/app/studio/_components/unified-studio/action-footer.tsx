"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, Sparkles } from "lucide-react";
import type { PresignRequest } from "@segmentationapi/sdk";
import Link from "next/link";
import { toast } from "sonner";

import { getBillingGateState } from "@/lib/billing-presentation";
import type { DynamoBillingState } from "@/lib/server/aws/dynamo";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useInputTasks,
  useIsValidInput,
  useFps,
  useJobId,
  usePrompts,
  useSetJobId,
  useSetJobStatus,
  useStatus,
  useSetTotalItems,
  useUpdateInputTask,
} from "../../_store/studio.store";
import {
  createJob,
  createJobDownload,
  createPlaygroundJob,
  createPresignRequest,
  getJobDownload,
} from "../../actions";
import {
  buildStudioJobRequest,
  ensurePreparedTasks,
  getStudioActionErrorMessage,
  getStudioRunDisabledReason,
  isStudioJobRunning,
  sanitizeStudioPrompts,
  toSupportedContentType,
} from "../../utils";
import { putToPresignedS3 } from "@/lib/utils";

type SubmitInputTask = {
  file: File;
  uploadUrl?: string;
  taskId?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerBrowserDownload(url: string) {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.src = url;
  document.body.appendChild(iframe);

  window.setTimeout(() => {
    iframe.remove();
  }, 60_000);
}

export function ActionFooter({
  billingState,
  hasActiveApiKey,
  isPlaygroundMode,
}: {
  billingState: DynamoBillingState | null;
  hasActiveApiKey: boolean;
  isPlaygroundMode: boolean;
}) {
  const isValidInput = useIsValidInput();
  const inputTasks = useInputTasks();
  const fps = useFps();
  const jobId = useJobId();
  const prompts = usePrompts();
  const setJobId = useSetJobId();
  const setJobStatus = useSetJobStatus();

  const status = useStatus();
  const setTotalItems = useSetTotalItems();
  const updateInputTask = useUpdateInputTask();
  const [isDownloading, setIsDownloading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "uploading" | "submitting">("idle");
  const downloadRequestIdRef = useRef(0);

  const isRunning = isStudioJobRunning(status);
  const billingGate = getBillingGateState(billingState);
  const isBillingBlocked = !isPlaygroundMode && !billingGate.canRunJobs;
  const isMissingActiveApiKey = !hasActiveApiKey;
  const isSubmitting = submitPhase !== "idle";
  const isRunDisabled =
    !isValidInput || isRunning || isBillingBlocked || isMissingActiveApiKey || isSubmitting;
  const isDownloadDisabled = !jobId || status !== "completed" || isDownloading;
  const downloadButtonLabel = isDownloading ? "Preparing Download…" : "Download Artifacts";
  const hasPrompts = sanitizeStudioPrompts(prompts).length > 0;
  const disabledReason = getStudioRunDisabledReason({
    hasBillingBlock: isBillingBlocked,
    hasActiveApiKey,
    hasInputs: inputTasks.length > 0,
    hasPrompts,
    isRunning: isRunning || isSubmitting,
  });
  const runButtonLabel =
    submitPhase === "uploading"
      ? "Uploading…"
      : submitPhase === "submitting"
        ? "Queueing…"
        : isPlaygroundMode
          ? "Run Playground"
          : "Run Job";

  useEffect(() => {
    return () => {
      downloadRequestIdRef.current += 1;
    };
  }, []);

  const handleRunJob = async () => {
    const preparedPrompts = sanitizeStudioPrompts(prompts);

    if (!inputTasks.length || !preparedPrompts.length || isBillingBlocked || isMissingActiveApiKey) {
      return;
    }

    downloadRequestIdRef.current += 1;
    setIsDownloading(false);
    setSubmitPhase("uploading");

    try {
      const uploadedTasks: SubmitInputTask[] = [...inputTasks];

      for (const [index, inputTask] of inputTasks.entries()) {
        if (!inputTask.taskId || !inputTask.uploadUrl) {
          const request: PresignRequest = { contentType: toSupportedContentType(inputTask.file) };
          const response = await createPresignRequest(request);
          await putToPresignedS3(response.uploadUrl, inputTask.file);

          updateInputTask(index, response.taskId, response.uploadUrl);
          uploadedTasks[index] = {
            ...uploadedTasks[index],
            taskId: response.taskId,
            uploadUrl: response.uploadUrl,
          };
        }
      }

      setSubmitPhase("submitting");

      const preparedTasks = ensurePreparedTasks(uploadedTasks);
      const jobRequest = buildStudioJobRequest(preparedTasks, preparedPrompts, fps);
      const jobResponse = isPlaygroundMode
        ? await createPlaygroundJob(jobRequest)
        : await createJob(jobRequest);

      setJobId(jobResponse.jobId);
      setJobStatus("queued");
      setTotalItems(jobResponse.totalItems);
    } catch (error) {
      console.error(error);
      const message = getStudioActionErrorMessage("submit", error);
      toast.error(message);
    } finally {
      setSubmitPhase("idle");
    }
  };

  const handleDownloadArtifacts = async () => {
    if (!jobId || status !== "completed" || isDownloading) return;

    const requestId = downloadRequestIdRef.current + 1;
    downloadRequestIdRef.current = requestId;
    setIsDownloading(true);

    try {
      let download = await createJobDownload(jobId);

      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (downloadRequestIdRef.current !== requestId) {
          return;
        }

        if (download.status === "ready" && download.downloadUrl) {
          triggerBrowserDownload(download.downloadUrl);
          return;
        }

        if (download.status === "failed") {
          throw new Error(download.error ?? "download_failed");
        }

        await sleep((download.retryAfterSeconds ?? 2) * 1000);
        download = await getJobDownload(jobId);
      }

      throw new Error("download_timeout");
    } catch (error) {
      console.error(error);
      toast.error(getStudioActionErrorMessage("download", error));
    } finally {
      if (downloadRequestIdRef.current === requestId) {
        setIsDownloading(false);
      }
    }
  };

  return (
    <div className="border-border/30 shrink-0 border-t px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={isRunDisabled}
          onClick={handleRunJob}
          size="lg"
        >
          {isRunning || isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {runButtonLabel}
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {runButtonLabel}
            </>
          )}
        </Button>

        {!isPlaygroundMode ? (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={downloadButtonLabel}
            title={downloadButtonLabel}
            disabled={isDownloadDisabled}
            onClick={handleDownloadArtifacts}
          >
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          </Button>
        ) : null}
      </div>

      {isPlaygroundMode ? (
        <Alert className="border-amber-400/25 bg-amber-500/8 mt-3 rounded-[1rem] border px-3 py-3">
          <AlertTriangle className="mt-0.5 size-4 text-amber-300" aria-hidden />
          <AlertTitle className="font-mono text-[11px] tracking-[0.14em] uppercase">
            Playground Mode
          </AlertTitle>
          <AlertDescription>
            You are using playground mode with limited features. Attach a credit card to unlock batch
            processing, video support, and downloadable artifacts.
          </AlertDescription>
          <AlertAction className="static mt-3 sm:absolute sm:mt-0">
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "border-amber-400/35 bg-background/55 hover:bg-background/80 font-mono tracking-[0.12em] uppercase",
              })}
            >
              Attach credit card
            </Link>
          </AlertAction>
        </Alert>
      ) : isBillingBlocked ? (
        <Alert className="border-primary/25 bg-primary/8 mt-3 rounded-[1rem] border px-3 py-3">
          <AlertTriangle className="text-primary mt-0.5 size-4" aria-hidden />
          <AlertTitle className="font-mono text-[11px] tracking-[0.14em] uppercase">
            {billingGate.statusLabel}
          </AlertTitle>
          <AlertDescription>{billingGate.description}</AlertDescription>
          <AlertAction className="static mt-3 sm:absolute sm:mt-0">
            <Link
              href={billingGate.ctaHref}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "border-primary/35 bg-background/55 hover:bg-background/80 font-mono tracking-[0.12em] uppercase",
              })}
            >
              {billingGate.ctaLabel}
            </Link>
          </AlertAction>
        </Alert>
      ) : isMissingActiveApiKey ? (
        <Alert className="border-amber-400/25 bg-amber-500/8 mt-3 rounded-[1rem] border px-3 py-3">
          <AlertTriangle className="mt-0.5 size-4 text-amber-300" aria-hidden />
          <AlertTitle className="font-mono text-[11px] tracking-[0.14em] uppercase">
            Active API Key Required
          </AlertTitle>
          <AlertDescription>
            Set the active API key on your account before using Studio. Open the user menu in the
            top-right corner, paste your key, and save it there.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
