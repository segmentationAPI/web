"use client";

import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { PlaygroundErrorState } from "./playground-types";

type PlaygroundErrorCardProps = {
  error: PlaygroundErrorState;
};

export function PlaygroundErrorCard({ error }: PlaygroundErrorCardProps) {
  return (
    <Card className="rounded-[1.15rem] border-destructive/35 bg-destructive/10 py-4">
      <CardContent className="space-y-2">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          {error.title}
        </p>
        <div className="space-y-1">
          {error.details.map((detail, index) => (
            <p key={`${detail}-${index}`} className="break-all text-xs text-destructive">
              {detail}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

