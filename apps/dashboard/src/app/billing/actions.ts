"use server";

import { db } from "@segmentation/db";
import { creditPurchase } from "@segmentation/db/schema/app";
import { user } from "@segmentation/db/schema/auth";
import { env } from "@segmentation/env/dashboard";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { MAX_PURCHASE_USD, MIN_PURCHASE_USD, TOKENS_PER_USD } from "@/lib/server/constants";
import { requirePageSession } from "@/lib/server/page-auth";
import { getStripeClient } from "@/lib/server/stripe";

const checkoutPayloadSchema = z.object({
  amountUsd: z.number().finite(),
});

const PAYMENTS_ENABLED = process.env.ENABLE_PAYMENTS === "true";
const PAYMENTS_DISABLED_MESSAGE = "Payments are currently under construction. Please try again later.";

type CheckoutActionResult =
  | {
      checkoutUrl: string;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

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

export async function createCheckoutSessionAction(
  input: z.input<typeof checkoutPayloadSchema>,
): Promise<CheckoutActionResult> {
  if (!PAYMENTS_ENABLED) {
    return {
      error: PAYMENTS_DISABLED_MESSAGE,
      ok: false,
    };
  }

  const session = await requirePageSession();

  const parsed = checkoutPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid request body",
      ok: false,
    };
  }

  const amountUsd = Math.round(parsed.data.amountUsd * 100) / 100;

  if (amountUsd < MIN_PURCHASE_USD || amountUsd > MAX_PURCHASE_USD) {
    return {
      error: `Amount must be between $${MIN_PURCHASE_USD} and $${MAX_PURCHASE_USD}`,
      ok: false,
    };
  }

  const userId = session.user.id;
  const amountUsdCents = Math.round(amountUsd * 100);
  const tokensGranted = Math.floor((amountUsdCents * TOKENS_PER_USD) / 100);

  const [currentUser] = await db
    .select({
      id: user.id,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    return {
      error: "User not found",
      ok: false,
    };
  }

  let stripeCustomerId: string;

  try {
    stripeCustomerId = await getOrCreateStripeCustomer({
      email: session.user.email,
      existingStripeCustomerId: currentUser.stripeCustomerId,
      userId: currentUser.id,
      userName: session.user.name,
    });
  } catch (error) {
    console.error("Failed to initialize Stripe customer", error);
    return {
      error: "Failed to initialize billing customer",
      ok: false,
    };
  }

  const stripe = getStripeClient();

  let checkoutSessionId = "";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      cancel_url: env.NEXT_PUBLIC_STRIPE_CANCEL_URL,
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              description: `${tokensGranted.toLocaleString()} SAM3 tokens`,
              name: "SAM3 API Credits",
            },
            unit_amount: amountUsdCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        accountId: userId,
        amountUsdCents: String(amountUsdCents),
        tokensGranted: String(tokensGranted),
      },
      mode: "payment",
      success_url: env.NEXT_PUBLIC_STRIPE_SUCCESS_URL,
    });

    if (!checkoutSession.url) {
      return {
        error: "Failed to create Stripe checkout",
        ok: false,
      };
    }

    checkoutSessionId = checkoutSession.id;

    await db.insert(creditPurchase).values({
      amountUsdCents,
      id: `purchase_${crypto.randomUUID()}`,
      status: "pending",
      stripeCheckoutSessionId: checkoutSession.id,
      tokensGranted,
      userId,
    });

    return {
      checkoutUrl: checkoutSession.url,
      ok: true,
    };
  } catch (error) {
    if (checkoutSessionId) {
      await db
        .update(creditPurchase)
        .set({
          failureReason: "Failed to persist checkout state",
          status: "failed",
        })
        .where(
          and(
            eq(creditPurchase.userId, userId),
            eq(creditPurchase.stripeCheckoutSessionId, checkoutSessionId),
          ),
        )
        .catch(() => undefined);
    }

    console.error("Failed to create Stripe checkout", error);

    return {
      error: "Failed to create Stripe checkout",
      ok: false,
    };
  }
}
