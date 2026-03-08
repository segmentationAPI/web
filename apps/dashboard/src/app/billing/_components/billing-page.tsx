"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  createBillingPortalSessionAction,
  createSubscriptionCheckoutSessionAction,
} from "@/app/billing/actions";
import { formatDate } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DynamoBillingState } from "@/lib/server/aws/dynamo";

function describeBillingState(billingState: DynamoBillingState | null) {
  if (!billingState) {
    return {
      eyebrow: "Subscription Required",
      toneClass: "border-amber-400/40 bg-amber-400/10 text-amber-200",
      value: "No active subscription",
    };
  }

  if (billingState.accessStatus === "allowed") {
    return {
      eyebrow: "Usage Enabled",
      toneClass: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
      value: billingState.stripeSubscriptionStatus ?? "active",
    };
  }

  return {
    eyebrow: "Usage Blocked",
    toneClass: "border-destructive/40 bg-destructive/10 text-destructive",
    value: billingState.stripeSubscriptionStatus ?? billingState.latestInvoiceStatus ?? "blocked",
  };
}

export function BillingPageContent({
  billingState,
}: {
  billingState: DynamoBillingState | null;
}) {
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const descriptor = describeBillingState(billingState);
  const hasManageableSubscription = Boolean(
    billingState?.stripeSubscriptionStatus &&
      ["active", "trialing", "past_due"].includes(billingState.stripeSubscriptionStatus),
  );

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

  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Billing
        </CardDescription>
        <CardTitle className="font-display tracking-[0.03em] text-foreground">
          Stripe Metered Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-xl border p-3 ${descriptor.toneClass}`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em]">{descriptor.eyebrow}</p>
          <p className="mt-1 text-sm font-medium capitalize">{descriptor.value}</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-current/80">
            Usage is billed from completed worker tasks only.
          </p>
        </div>

        <div className="grid gap-3 rounded-xl border border-border/70 bg-card/55 p-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Subscription Status
            </p>
            <p className="mt-1 text-sm text-foreground">
              {billingState?.stripeSubscriptionStatus ?? "not_started"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Latest Invoice
            </p>
            <p className="mt-1 text-sm text-foreground">
              {billingState?.latestInvoiceStatus ?? "none"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Current Period End
            </p>
            <p className="mt-1 text-sm text-foreground">
              {billingState?.currentPeriodEnd ? formatDate(billingState.currentPeriodEnd) : "n/a"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Billing State Updated
            </p>
            <p className="mt-1 text-sm text-foreground">
              {billingState?.updatedAt ? formatDate(billingState.updatedAt) : "Awaiting webhook sync"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => void handleStartSubscription()}
            disabled={startingCheckout || hasManageableSubscription}
            className="border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
          >
            {startingCheckout ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Redirecting
              </>
            ) : (
              <>
                <CreditCard className="size-3.5" aria-hidden />
                Start Subscription
              </>
            )}
          </Button>
          <Button
            onClick={() => void handleOpenPortal()}
            disabled={openingPortal}
            variant="outline"
            className="border-border/70 bg-background/55 font-mono uppercase tracking-[0.14em]"
          >
            {openingPortal ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Opening
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Webhook-derived billing state is enforced by the AWS authorizer.
        </p>
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
