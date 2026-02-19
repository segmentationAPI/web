"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatNumber } from "@/components/dashboard-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BalanceResponse = {
  tokenUsageLast24h: number;
  tokensRemaining: number;
};

export function OverviewPageContent({ userName }: { userName: string }) {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBalance() {
    try {
      const response = await fetch("/api/balance", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch account overview");
      }

      const data = (await response.json()) as BalanceResponse;

      setBalance(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load account overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBalance();
  }, []);

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
              {loading ? "..." : formatNumber(balance?.tokensRemaining ?? null)}
            </div>
          </div>
          <div className="rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d90aa]">
              Last 24h Usage
            </div>
            <div className="mt-2 font-display text-3xl text-[#2cf4ff]">
              {loading ? "..." : formatNumber(balance?.tokenUsageLast24h ?? null)}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function OverviewPage({ userName }: { userName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <OverviewPageContent userName={userName} />
    </main>
  );
}
