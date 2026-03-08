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
    <Card className="glass-panel border-border/70 bg-card/80 rounded-[1.25rem] py-3">
      <CardHeader className="pb-2">
        <CardDescription className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
          Account Overview
        </CardDescription>
        <CardTitle className="font-display text-foreground text-lg tracking-[0.03em] sm:text-xl">
          {userName}
        </CardTitle>
      </CardHeader>
      <CardContent className="border-border/50 border-t pt-3">
        <div className="space-y-1">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            Last 24h Usage
          </p>
          <p className="font-display text-primary text-2xl leading-none sm:text-[2rem]">
            {formatNumber(overview.tokenUsageLast24h)}
          </p>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            Metered usage from completed worker tasks.
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
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pt-4 pb-10 sm:px-6">
      <OverviewPageContent overview={overview} userName={userName} />
    </main>
  );
}
