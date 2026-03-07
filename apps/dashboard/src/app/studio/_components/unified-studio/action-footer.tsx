"use client";

import { Download, Loader2, Sparkles } from "lucide-react";
import type { PresignRequest } from "@segmentationapi/sdk";

import { Button } from "@/components/ui/button";
import {
  useInputTasks,
  useIsValidInput,
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

export function ActionFooter() {
  const isValidInput = useIsValidInput();
  const inputTasks = useInputTasks();
  const prompts = usePrompts();
  const setJobId = useSetJobId();
  const setJobStatus = useSetJobStatus();
  const status = useStatus();
  const setTotalItems = useSetTotalItems();
  const updateInputTask = useUpdateInputTask();

  const isRunning = isStudioJobRunning(status);

  const handleRunJob = async () => {
    if (!inputTasks.length || !prompts.length) return;

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
    const jobRequest = buildStudioJobRequest(preparedTasks, prompts);
    const jobResponse = await createJob(jobRequest);

    setJobId(jobResponse.jobId);
    setJobStatus(jobResponse.status);
    setTotalItems(jobResponse.totalItems);
  };

  return (
    <div className="border-border/30 flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3 sm:px-5">
      <Button type="button" disabled={!isValidInput} onClick={handleRunJob} size="lg">
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

      {/* TODO: implement upload progress*/}
    </div>
  );
}
