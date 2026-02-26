"use client";

import { formatNumber } from "@/components/dashboard-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BalanceData } from "@/lib/dashboard-types";

export function BillingPageContent({ balance }: { balance: BalanceData }) {
  return (
    <>
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Current Balance
          </CardDescription>
          <CardTitle className="font-display tracking-[0.03em] text-foreground">
            Billing Overview
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

      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Buy Credits
          </CardDescription>
          <CardTitle className="font-display tracking-[0.03em] text-foreground">
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 font-mono text-[12px] text-amber-200">
            Payments are currently under construction. Please try again later.
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function BillingPage({ balance }: { balance: BalanceData }) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <BillingPageContent balance={balance} />
    </main>
  );
}
