"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PlaygroundErrorCard } from "./playground-error-card";
import { PlaygroundForm } from "./playground-form";
import { PlaygroundPreview } from "./playground-preview";
import { usePlaygroundSegmentation } from "./use-playground-segmentation";

export function PlaygroundPageContent() {
  const playground = usePlaygroundSegmentation();
  const masks = playground.result?.masks ?? [];

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
            apiKey={playground.apiKey}
            onApiKeyChange={playground.setApiKey}
            onFileSelected={playground.onFileSelected}
            onPromptChange={playground.setPrompt}
            onRunRequested={playground.onRunRequested}
            prompt={playground.prompt}
            runButtonState={playground.runButtonState}
            showStatusMessage={Boolean(playground.selectedFile)}
            statusMessage={playground.statusMessage}
          />

          <PlaygroundPreview
            hasResult={Boolean(playground.result)}
            masks={masks}
            selectedFile={playground.selectedFile}
          />
        </CardContent>
      </Card>

      {playground.error ? <PlaygroundErrorCard error={playground.error} /> : null}
    </div>
  );
}

