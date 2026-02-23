import { db } from "@segmentation/db";
import { creditPurchase } from "@segmentation/db/schema/app";
import { env } from "@segmentation/env/dashboard";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { incrementDynamoTokenBalance } from "@/lib/server/aws/dynamo";
import { getStripeClient } from "@/lib/server/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);

    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object;

  if (!checkoutSession.id) {
    return NextResponse.json({ error: "Missing checkout session ID" }, { status: 400 });
  }

  const [purchase] = await db
    .select()
    .from(creditPurchase)
    .where(eq(creditPurchase.stripeCheckoutSessionId, checkoutSession.id))
    .limit(1);

  if (!purchase) {
    return NextResponse.json({ error: "Purchase record not found" }, { status: 404 });
  }

  if (purchase.status === "completed") {
    return NextResponse.json({ received: true, replay: true });
  }

  if (purchase.stripeEventId && purchase.stripeEventId !== event.id) {
    return NextResponse.json({ received: true, replay: true });
  }

  try {
    if (!purchase.stripeEventId) {
      await db
        .update(creditPurchase)
        .set({
          stripeEventId: event.id,
        })
        .where(eq(creditPurchase.id, purchase.id));
    }

    await incrementDynamoTokenBalance(purchase.userId, purchase.tokensGranted);

    await db
      .update(creditPurchase)
      .set({
        completedAt: new Date(),
        status: "completed",
      })
      .where(
        and(
          eq(creditPurchase.id, purchase.id),
          eq(creditPurchase.stripeCheckoutSessionId, checkoutSession.id),
        ),
      );
  } catch (error) {
    console.error("Failed to apply Stripe credits", error);

    await db
      .update(creditPurchase)
      .set({
        failureReason: "Failed to apply credits",
        status: "failed",
      })
      .where(eq(creditPurchase.id, purchase.id))
      .catch(() => undefined);

    return NextResponse.json({ error: "Failed to apply credits" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
