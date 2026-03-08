"use client";

import { ArrowUpRight, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  createBillingPortalSessionAction,
  createSubscriptionCheckoutSessionAction,
} from "@/app/billing/actions";
import { formatDate } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { DynamoBillingState } from "@/lib/server/aws/dynamo";

function getBillingPresentation(billingState: DynamoBillingState | null) {
  const hasBillingSetup = Boolean(
    billingState?.stripeCustomerId ||
      billingState?.stripeSubscriptionId ||
      billingState?.stripeSubscriptionStatus,
  );

  if (!hasBillingSetup) {
    return {
      ctaLabel: "Attach a credit card to get started",
      detail: "Add a card once. Billing will only apply to completed worker usage.",
      inlineDetail: "Secure checkout opens in Stripe.",
      isReady: false,
    };
  }

  const usageEnabled = billingState?.accessStatus === "allowed";
  const rawStatus =
    billingState?.stripeSubscriptionStatus ?? billingState?.latestInvoiceStatus ?? "customer_created";

  return {
    ctaLabel: "Manage billing",
    detail: "",
    inlineDetail: usageEnabled
      ? "Your payment method is on file. Open Stripe to update card details or invoices."
      : "Review the current subscription state and resolve any billing issues in Stripe.",
    isReady: usageEnabled,
    subscriptionState: rawStatus.replaceAll("_", " "),
  };
}

export function BillingPageContent({
  billingState,
}: {
  billingState: DynamoBillingState | null;
}) {
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const presentation = getBillingPresentation(billingState);
  const isWorking = startingCheckout || openingPortal;

  async function handleStartSubscription() {
    setStartingCheckout(true);

    try {
      const response = await createSubscriptionCheckoutSessionAction({});
      if (!response.ok) {
        throw new Error(response.error);
      }

      window.location.assign(response.url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to start subscription");
      setStartingCheckout(false);
    }
  }

  async function handleOpenPortal() {
    setOpeningPortal(true);

    try {
      const response = await createBillingPortalSessionAction({});
      if (!response.ok) {
        throw new Error(response.error);
      }

      window.location.assign(response.url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
      setOpeningPortal(false);
    }
  }

  async function handlePrimaryAction() {
    if (presentation.isReady || billingState?.stripeCustomerId || billingState?.stripeSubscriptionId) {
      await handleOpenPortal();
      return;
    }

    await handleStartSubscription();
  }

  return (
    <Card className="glass-panel relative rounded-[1.6rem] border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(255,112,63,0.2),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(57,213,201,0.16),transparent_24%),rgba(13,16,24,0.82)] py-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <CardHeader className="gap-4">
        <CardDescription className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Billing
        </CardDescription>
        {presentation.detail ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {presentation.detail}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-[1.35rem] border border-white/8 bg-black/15 p-4 backdrop-blur-sm md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {presentation.isReady ? (
              <ShieldCheck className="size-5 text-secondary" aria-hidden />
            ) : (
              <CreditCard className="size-5 text-primary" aria-hidden />
            )}
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg text-foreground">
              {presentation.isReady ? "Payment method attached" : "Attach a credit card to get started"}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">{presentation.inlineDetail}</p>
          </div>
        </div>

        <Button
          onClick={() => void handlePrimaryAction()}
          disabled={isWorking}
          size="lg"
          className="h-12 w-full rounded-[1rem] border border-primary/40 bg-[linear-gradient(135deg,rgba(255,112,63,0.95),rgba(255,147,81,0.92))] px-4 font-mono uppercase tracking-[0.16em] text-primary-foreground shadow-[0_18px_50px_rgba(255,112,63,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-105"
        >
          {isWorking ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {openingPortal ? "Opening billing" : "Redirecting"}
            </>
          ) : (
            <>
              {presentation.isReady ? (
                <ArrowUpRight className="size-4" aria-hidden />
              ) : (
                <CreditCard className="size-4" aria-hidden />
              )}
              {presentation.ctaLabel}
            </>
          )}
        </Button>

        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-background/35 px-3 py-2.5">
            <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Access</p>
            <p className="mt-1 text-foreground">
              {billingState?.accessStatus === "allowed" ? "Enabled" : "Blocked"}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/35 px-3 py-2.5">
            <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">Period End</p>
            <p className="mt-1 text-foreground">
              {billingState?.currentPeriodEnd ? formatDate(billingState.currentPeriodEnd) : "--"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage({
  billingState,
}: {
  billingState: DynamoBillingState | null;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <BillingPageContent billingState={billingState} />
    </main>
  );
}
