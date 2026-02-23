"use client";

import { formatNumber } from "@/components/dashboard-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BalanceData } from "@/lib/dashboard-types";

export function OverviewPageContent({
  balance,
  userName,
}: {
  balance: BalanceData;
  userName: string;
}) {
  return (
    <>
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Account Overview
          </CardDescription>
          <CardTitle className="font-display text-2xl tracking-[0.03em] text-foreground">
            {userName}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
        </CardContent>
      </Card>
    </>
  );
}

export default function OverviewPage({
  balance,
  userName,
}: {
  balance: BalanceData;
  userName: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <OverviewPageContent balance={balance} userName={userName} />
    </main>
  );
}
