"use server"

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";

/**
 * Handles Stripe Checkout Session creation.
 * 
 * @param priceId - The Stripe Price ID for the selected plan.
 * @returns Redirects the user to the Stripe-hosted checkout page.
 */
export async function createCheckoutSession(priceId: string) {
    const { orgId, userEmail } = await getCurrentOrg();

    if (!orgId || !userEmail) {
        throw new Error("Organization context or user email is missing.");
    }
  // 1. Get the current user's Stripe Customer ID from your DB
  // This is a placeholder; replace it with your actual auth/db logic.
    let stripeCustomerId: string | null = 'string | null'; // Initialize as empty string to avoid 'string | null' issues

    const subscriptionData = await prisma.subscription.findUnique({ 
        where: { orgId: orgId } 
    });
    
    stripeCustomerId = subscriptionData?.stripeCustomerId || null;
    if (!subscriptionData) {
        // If no customer ID exists, create a new Stripe Customer
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: { orgId: orgId },
        });
        stripeCustomerId = customer.id;
    }

  let session;

  try {
    // 2. Create the Checkout Session
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId ?? undefined,
      customer_email: stripeCustomerId ? undefined : userEmail, // Use email only if no customer ID exists
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", // Since these are monthly plans
      success_url: `${process.env.NEXTAUTH_URL}/settings?tab=billing&success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings?tab=billing&canceled=true`,
      
      // Automatic tax and billing address collection (optional but recommended)
      billing_address_collection: "auto",
      
      // Metadata helps identify the action in your Webhook later
      metadata: {
        orgId: orgId,
        priceId: priceId,
      },
      subscription_data: {
        metadata: {
        orgId: orgId,
        },
    },
    });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error.message);
    throw new Error("Could not initiate checkout. Please try again.");
  }

  // 3. Redirect to Stripe's hosted page
  if (session.url) {
    redirect(session.url);
  }
}
