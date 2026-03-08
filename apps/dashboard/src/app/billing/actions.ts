"use server";

import { db } from "@segmentation/db";
import { user } from "@segmentation/db/schema/auth";
import { env } from "@segmentation/env/dashboard";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDynamoBillingState } from "@/lib/server/aws/dynamo";
import { requirePageSession } from "@/lib/server/page-auth";
import { getStripeClient } from "@/lib/server/stripe";

type BillingActionResult =
  | {
      ok: true;
      url: string;
    }
  | {
      error: string;
      ok: false;
    };

const emptyInputSchema = z.object({});

async function getOrCreateStripeCustomer(params: {
  email: string;
  existingStripeCustomerId: string | null;
  userId: string;
  userName: string;
}) {
  if (params.existingStripeCustomerId) {
    return params.existingStripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: params.email,
    metadata: {
      accountId: params.userId,
    },
    name: params.userName,
  });

  await db
    .update(user)
    .set({
      stripeCustomerId: customer.id,
    })
    .where(eq(user.id, params.userId));

  return customer.id;
}

async function loadCurrentUser(userId: string) {
  const [currentUser] = await db
    .select({
      id: user.id,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return currentUser ?? null;
}

export async function createSubscriptionCheckoutSessionAction(
  input: z.input<typeof emptyInputSchema>,
): Promise<BillingActionResult> {
  const parsed = emptyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Invalid request body",
      ok: false,
    };
  }

  const session = await requirePageSession();
  const currentUser = await loadCurrentUser(session.user.id);
  if (!currentUser) {
    return {
      error: "User not found",
      ok: false,
    };
  }

  const billingState = await getDynamoBillingState(session.user.id);
  if (
    billingState?.stripeSubscriptionStatus &&
    ["active", "trialing", "past_due"].includes(billingState.stripeSubscriptionStatus)
  ) {
    return {
      error: "An active subscription already exists. Manage it in the billing portal.",
      ok: false,
    };
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer({
      email: session.user.email,
      existingStripeCustomerId: currentUser.stripeCustomerId,
      userId: currentUser.id,
      userName: session.user.name,
    });

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: env.NEXT_PUBLIC_STRIPE_CANCEL_URL,
      customer: stripeCustomerId,
      line_items: [
        {
          price: env.STRIPE_SUBSCRIPTION_PRICE_ID,
        },
      ],
      metadata: {
        accountId: currentUser.id,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          accountId: currentUser.id,
        },
      },
      success_url: env.NEXT_PUBLIC_STRIPE_SUCCESS_URL,
    });

    if (!checkoutSession.url) {
      return {
        error: "Failed to create Stripe checkout",
        ok: false,
      };
    }

    revalidatePath("/");

    return {
      ok: true,
      url: checkoutSession.url,
    };
  } catch (error) {
    console.error("Failed to create Stripe subscription checkout", error);
    return {
      error: "Failed to create Stripe subscription checkout",
      ok: false,
    };
  }
}

export async function createBillingPortalSessionAction(
  input: z.input<typeof emptyInputSchema>,
): Promise<BillingActionResult> {
  const parsed = emptyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Invalid request body",
      ok: false,
    };
  }

  const session = await requirePageSession();
  const currentUser = await loadCurrentUser(session.user.id);
  if (!currentUser) {
    return {
      error: "User not found",
      ok: false,
    };
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer({
      email: session.user.email,
      existingStripeCustomerId: currentUser.stripeCustomerId,
      userId: currentUser.id,
      userName: session.user.name,
    });

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: env.STRIPE_BILLING_PORTAL_RETURN_URL,
    });

    revalidatePath("/");

    return {
      ok: true,
      url: portalSession.url,
    };
  } catch (error) {
    console.error("Failed to create Stripe billing portal session", error);
    return {
      error: "Failed to create Stripe billing portal session",
      ok: false,
    };
  }
}
