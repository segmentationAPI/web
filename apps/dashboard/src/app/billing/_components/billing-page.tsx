"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { formatNumber } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BalanceResponse = {
  tokenUsageLast24h: number;
  tokensRemaining: number;
};

export function BillingPageContent() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [purchaseAmount, setPurchaseAmount] = useState("25");
  const [checkingOut, setCheckingOut] = useState(false);

  const predictedTokens = useMemo(() => {
    const amount = Number.parseFloat(purchaseAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    return Math.floor(amount * 100);
  }, [purchaseAmount]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/balance", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch balance");
        }

        const data = (await response.json()) as BalanceResponse;

        setBalance(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load current balance");
      } finally {
        setLoadingBalance(false);
      }
    })();
  }, []);

  async function handleCheckout() {
    setCheckingOut(true);

    try {
      const amountUsd = Number.parseFloat(purchaseAmount);

      if (!Number.isFinite(amountUsd)) {
        throw new Error("Invalid amount");
      }

      const response = await fetch("/api/stripe/checkout", {
        body: JSON.stringify({ amountUsd }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;

        throw new Error(body?.error || "Failed to start checkout");
      }

      const data = (await response.json()) as {
        checkoutUrl: string;
      };

      if (!data.checkoutUrl) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
            Current Balance
          </CardDescription>
          <CardTitle className="font-display tracking-[0.08em] text-[#e8f7ff]">Billing Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d90aa]">
              Tokens Remaining
            </div>
            <div className="mt-2 font-display text-3xl text-[#8eff6f]">
              {loadingBalance ? "..." : formatNumber(balance?.tokensRemaining ?? null)}
            </div>
          </div>
          <div className="rounded-none border border-[#2cf4ff]/20 bg-[#0a1322]/90 p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7d90aa]">
              Last 24h Usage
            </div>
            <div className="mt-2 font-display text-3xl text-[#2cf4ff]">
              {loadingBalance ? "..." : formatNumber(balance?.tokenUsageLast24h ?? null)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
            Buy Credits
          </CardDescription>
          <CardTitle className="font-display tracking-[0.08em] text-[#e8f7ff]">Stripe Checkout (USD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="purchase-amount" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">
              Amount ($5 - $500)
            </label>
            <Input
              id="purchase-amount"
              type="number"
              min={5}
              max={500}
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              className="border-[#2cf4ff]/30 bg-[#040912]"
            />
          </div>

          <div className="rounded-none border border-[#8eff6f]/25 bg-[#8eff6f]/5 p-2 font-mono text-[12px] text-[#ccffc0]">
            Estimated credit: {predictedTokens.toLocaleString()} tokens
          </div>

          <Button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full border border-[#8eff6f]/30 bg-[#8eff6f]/15 font-mono uppercase tracking-[0.14em] text-[#cfffbf] hover:bg-[#8eff6f]/25"
          >
            {checkingOut ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Redirecting
              </>
            ) : (
              <>
                <CreditCard className="size-3.5" aria-hidden />
                Buy Tokens
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default function BillingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <BillingPageContent />
    </main>
  );
}
