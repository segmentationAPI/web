"use client";

import { formatNumber } from "@/components/dashboard-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BalanceData } from "@/lib/dashboard-types";

export function OverviewPageContent({ balance, userName }: { balance: BalanceData; userName: string }) {
  return (
    <>
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
            Account Overview
          </CardDescription>
          <CardTitle className="font-display text-2xl tracking-[0.06em] text-[#e8f7ff]">
            {userName}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d90aa]">
              Tokens Remaining
            </div>
            <div className="mt-2 font-display text-3xl text-[#8eff6f]">
              {formatNumber(balance.tokensRemaining)}
            </div>
          </div>
          <div className="rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d90aa]">
              Last 24h Usage
            </div>
            <div className="mt-2 font-display text-3xl text-[#2cf4ff]">
              {formatNumber(balance.tokenUsageLast24h)}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function OverviewPage({ balance, userName }: { balance: BalanceData; userName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <OverviewPageContent balance={balance} userName={userName} />
    </main>
  );
}
