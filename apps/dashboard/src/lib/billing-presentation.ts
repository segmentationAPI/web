import type { DynamoBillingState } from "@/lib/server/aws/dynamo";

export type BillingGateState = {
  canRunJobs: boolean;
  ctaHref: "/";
  ctaLabel: string;
  description: string;
  hasBillingSetup: boolean;
  inlineDetail: string;
  isReady: boolean;
  statusLabel: string;
  title: string;
};

export function getBillingGateState(billingState: DynamoBillingState | null): BillingGateState {
  const hasBillingSetup = Boolean(
    billingState?.stripeCustomerId ||
    billingState?.stripeSubscriptionId ||
    billingState?.stripeSubscriptionStatus,
  );
  const usageEnabled = billingState?.accessStatus === "allowed";

  if (!hasBillingSetup) {
    return {
      canRunJobs: false,
      ctaHref: "/",
      ctaLabel: "Attach credit card",
      description: "Studio jobs stay locked until you add a payment method from the home page.",
      hasBillingSetup,
      inlineDetail: "Secure checkout opens in Stripe.",
      isReady: false,
      statusLabel: "Billing required",
      title: "Attach a credit card to run Studio jobs",
    };
  }

  if (!usageEnabled) {
    return {
      canRunJobs: false,
      ctaHref: "/",
      ctaLabel: "Manage billing",
      description: "Your billing setup needs attention before Studio jobs can run.",
      hasBillingSetup,
      inlineDetail: "Open billing to review the current subscription state and payment details.",
      isReady: false,
      statusLabel: "Billing blocked",
      title: "Studio jobs are paused until billing is resolved",
    };
  }

  return {
    canRunJobs: true,
    ctaHref: "/",
    ctaLabel: "Manage billing",
    description: "Your payment method is attached and Studio jobs are ready to run.",
    hasBillingSetup,
    inlineDetail: "Your payment method is on file. Open Stripe to update card details or invoices.",
    isReady: true,
    statusLabel: "Billing ready",
    title: "Payment method attached",
  };
}
