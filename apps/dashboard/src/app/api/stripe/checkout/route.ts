import { db } from "@segmentation/db";
import { creditPurchase } from "@segmentation/db/schema/app";
import { user } from "@segmentation/db/schema/auth";
import { env } from "@segmentation/env/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MAX_PURCHASE_USD, MIN_PURCHASE_USD, TOKENS_PER_USD } from "@/lib/server/constants";
import { requireRouteUser } from "@/lib/server/route-auth";
import { getStripeClient } from "@/lib/server/stripe";

const bodySchema = z.object({
  amountUsd: z.number().finite(),
});

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

export async function POST(request: Request) {
  const context = await requireRouteUser(request);

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amountUsd = Math.round(parsed.data.amountUsd * 100) / 100;

  if (amountUsd < MIN_PURCHASE_USD || amountUsd > MAX_PURCHASE_USD) {
    return NextResponse.json(
      {
        error: `Amount must be between $${MIN_PURCHASE_USD} and $${MAX_PURCHASE_USD}`,
      },
      { status: 400 },
    );
  }

  const amountUsdCents = Math.round(amountUsd * 100);
  const tokensGranted = Math.floor((amountUsdCents * TOKENS_PER_USD) / 100);

  const [currentUser] = await db
    .select({
      id: user.id,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, context.userId))
    .limit(1);

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let stripeCustomerId: string;

  try {
    stripeCustomerId = await getOrCreateStripeCustomer({
      email: context.session.user.email,
      existingStripeCustomerId: currentUser.stripeCustomerId,
      userId: currentUser.id,
      userName: context.session.user.name,
    });
  } catch (error) {
    console.error("Failed to initialize Stripe customer", error);

    return NextResponse.json({ error: "Failed to initialize billing customer" }, { status: 500 });
  }

  const stripe = getStripeClient();

  const successUrl = env.STRIPE_SUCCESS_URL;
  const cancelUrl = env.STRIPE_CANCEL_URL;

  let checkoutSessionId = "";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      cancel_url: cancelUrl,
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
        accountId: context.userId,
        amountUsdCents: String(amountUsdCents),
        tokensGranted: String(tokensGranted),
      },
      mode: "payment",
      success_url: successUrl,
    });

    checkoutSessionId = checkoutSession.id;

    await db.insert(creditPurchase).values({
      amountUsdCents,
      id: `purchase_${crypto.randomUUID()}`,
      status: "pending",
      stripeCheckoutSessionId: checkoutSession.id,
      tokensGranted,
      userId: context.userId,
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
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
            eq(creditPurchase.userId, context.userId),
            eq(creditPurchase.stripeCheckoutSessionId, checkoutSessionId),
          ),
        )
        .catch(() => undefined);
    }

    console.error("Failed to create Stripe checkout", error);

    return NextResponse.json({ error: "Failed to create Stripe checkout" }, { status: 500 });
  }
}
