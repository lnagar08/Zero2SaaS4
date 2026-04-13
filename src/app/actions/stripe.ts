"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";

/**
 * Handles the logic for either opening the Customer Portal or Checkout Session.
 * Uses explicit type casting to resolve "string | null" TypeScript errors.
 */
export async function handleSubscriptionAction(priceId: string) {
  // 1. Fetch current organization context
  const { orgId, userEmail } = await getCurrentOrg();

  // Validate that org and critical fields are present
  if (!orgId || !userEmail) {
    throw new Error("Missing organization context or user email.");
  }

  
  // 2. Find organization in database
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true }
  });

  // 3. Handle Stripe Customer ID
  let customerId = organization?.stripeCustomerId;

  if (!customerId) {
    // Create a new customer if one doesn't exist
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { orgId: orgId },
    });

    customerId = customer.id;

    // Update DB with the new customer ID
    await prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  // CRITICAL FIX: Cast customerId to string to bypass the 'string | null' error
  const finalCustomerId = customerId as string;

  // 4. Check if a subscription already exists
  const currentSub = organization?.subscription;
  const isSubscribed = !!currentSub && ["ACTIVE", "TRIALING"].includes(currentSub.status);

  try {
    if (isSubscribed) {
      /**
       * CASE 1: Open Billing Portal (For existing customers)
       */
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: finalCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      });

      return redirect(portalSession.url);
    } else {
      /**
       * CASE 2: Open Checkout (For new customers)
       */
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: finalCustomerId,
        mode: "subscription",
        line_items: [{ price: 'price_1TJuTOLLiE68UHhjb7Xcc72t', quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        subscription_data: {
          trial_period_days: 14,
          metadata: { orgId: orgId },
        },
      });

      //return redirect(checkoutSession.url);
    }
  } catch (error: any) {
    // Ensure Next.js internal redirects are not caught as errors
    if (error.message === "NEXT_REDIRECT") throw error;
    
    console.error("Stripe Action Error:", error);
    throw new Error("Stripe session failed.");
  }
}
