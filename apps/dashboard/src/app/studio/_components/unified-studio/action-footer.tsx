"use client";

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
  usePrompts,
  useSetJobId,
  useSetJobStatus,
  useStatus,
  useSetTotalItems,
  useUpdateInputTask,
} from "../../_store/studio.store";
import { createJob, createPresignRequest } from "../../actions";
import {
  buildStudioJobRequest,
  ensurePreparedTasks,
  isStudioJobRunning,
  toSupportedContentType,
} from "../../utils";
import { putToPresignedS3 } from "@/lib/utils";

type SubmitInputTask = {
  file: File;
  uploadUrl?: string;
  taskId?: string;
};

export function ActionFooter({
  billingState,
  hasActiveApiKey,
}: {
  billingState: DynamoBillingState | null;
  hasActiveApiKey: boolean;
}) {
  const isValidInput = useIsValidInput();
  const inputTasks = useInputTasks();
  const fps = useFps();
  const prompts = usePrompts();
  const setJobId = useSetJobId();
  const setJobStatus = useSetJobStatus();
  const status = useStatus();
  const setTotalItems = useSetTotalItems();
  const updateInputTask = useUpdateInputTask();

  const isRunning = isStudioJobRunning(status);
  const billingGate = getBillingGateState(billingState);
  const isBillingBlocked = !billingGate.canRunJobs;
  const isMissingActiveApiKey = !hasActiveApiKey;
  const isRunDisabled = !isValidInput || isRunning || isBillingBlocked || isMissingActiveApiKey;

  const handleRunJob = async () => {
    if (!inputTasks.length || !prompts.length || isBillingBlocked || isMissingActiveApiKey) return;

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

      const preparedTasks = ensurePreparedTasks(uploadedTasks);
      const jobRequest = buildStudioJobRequest(preparedTasks, prompts, fps);
      const jobResponse = await createJob(jobRequest);

      setJobId(jobResponse.jobId);
      setJobStatus("queued");
      setTotalItems(jobResponse.totalItems);
      toast.success("Job submitted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit job");
    }
  };

  return (
    <div className="border-border/30 shrink-0 border-t px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={isRunDisabled} onClick={handleRunJob} size="lg">
          {isRunning ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Run Job
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={"Downloading artifacts"}
          disabled={false}
          onClick={() => {
            // TODO: implement download
            console.log("Download clicked");
          }}
        >
          <Download className="size-4" />
        </Button>
      </div>

      {isBillingBlocked ? (
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

      {/* TODO: implement upload progress*/}
    </div>
  );
}
