"use client";

import { formatNumber } from "@/components/dashboard-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverviewData } from "@/lib/dashboard-types";

export function OverviewPageContent({
  overview,
  userName,
}: {
  overview: OverviewData;
  userName: string;
}) {
  return (
    <Card className="glass-panel rounded-[1.25rem] border-border/70 bg-card/80 py-3">
      <CardHeader className="pb-2">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Account Overview
        </CardDescription>
        <CardTitle className="font-display text-lg tracking-[0.03em] text-foreground sm:text-xl">
          {userName}
        </CardTitle>
      </CardHeader>
      <CardContent className="border-t border-border/50 pt-3">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Last 24h Usage
          </p>
          <p className="font-display text-2xl leading-none text-primary sm:text-[2rem]">
            {formatNumber(overview.tokenUsageLast24h)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Metered usage while Stripe billing is being reworked.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage({
  overview,
  userName,
}: {
  overview: OverviewData;
  userName: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <OverviewPageContent overview={overview} userName={userName} />
    </main>
  );
}
