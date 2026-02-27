"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PlaygroundErrorCard } from "./playground-error-card";
import { PlaygroundForm } from "./playground-form";
import { PlaygroundPreview } from "./playground-preview";
import { usePlaygroundSegmentation } from "./use-playground-segmentation";

export function PlaygroundPageContent() {
  const playground = usePlaygroundSegmentation();
  const previewMasks =
    playground.result?.mode === "image" ? playground.result.previewMasks : [];

  return (
    <div className="space-y-5">
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Playground
          </CardDescription>
          <CardTitle className="font-display tracking-[0.03em] text-foreground">
            Try Segmentation with a Live Key
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <PlaygroundForm
            mode={playground.mode}
            onClearVideoAnnotations={playground.onClearVideoAnnotations}
            onImageFileSelected={playground.onImageFileSelected}
            onModeChange={playground.handleModeChange}
            onPromptsChange={playground.onPromptsChange}
            onRunRequested={playground.onRunRequested}
            onVideoBoxRemoved={playground.onVideoBoxRemoved}
            onVideoBoxUpdated={playground.onVideoBoxUpdated}
            onVideoFileSelected={playground.onVideoFileSelected}
            onVideoPointRemoved={playground.onVideoPointRemoved}
            onVideoPointUpdated={playground.onVideoPointUpdated}
            onVideoPromptModeChange={playground.onVideoPromptModeChange}
            onVideoSamplingChange={playground.onVideoSamplingChange}
            prompts={playground.prompts}
            runButtonState={playground.runButtonState}
            statusMessage={playground.statusMessage}
            setVideoFrameIdx={playground.setVideoFrameIdx}
            videoBoxes={playground.videoBoxes}
            videoFrameIdx={playground.videoFrameIdx}
            videoPoints={playground.videoPoints}
            videoPromptMode={playground.videoPromptMode}
            videoSampling={playground.videoSampling}
          />

          <PlaygroundPreview
            hasResult={Boolean(playground.result)}
            masks={previewMasks}
            mode={playground.mode}
            onVideoBoxCaptured={playground.onVideoBoxCaptured}
            onVideoPointCaptured={playground.onVideoPointCaptured}
            selectedImageFile={playground.selectedImageFile}
            selectedVideoFile={playground.selectedVideoFile}
            videoBoxes={playground.videoBoxes}
            videoPoints={playground.videoPoints}
            videoPromptMode={playground.videoPromptMode}
          />
        </CardContent>
      </Card>

      {playground.error ? <PlaygroundErrorCard error={playground.error} /> : null}
    </div>
  );
}
