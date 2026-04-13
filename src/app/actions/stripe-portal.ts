// lib/actions/stripe-portal.ts
"use server"
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";

export async function createPortalSession() {
  const { orgId, userEmail } = await getCurrentOrg();
  if (!orgId) {
    throw new Error("Organization context is missing.");
  }
    // Fetch the Stripe Customer ID for the current organization
    // Initialize as empty string to avoid 'string | null' issues
    let stripeCustomerId: string;

    const subscriptionData = await prisma.subscription.findUnique({ 
        where: { orgId: orgId } 
    });

    // If no subscription data exists, create a new Stripe Customer
    if (!subscriptionData) {
        // Create a new Stripe Customer
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: { orgId: orgId },
        });
        stripeCustomerId = customer.id;
        
        // Update the organization record with the new Stripe Customer ID
    } else {
        // If data exists, access its property
        stripeCustomerId = subscriptionData.stripeCustomerId;
    }
  
  // Creates a hosted portal session and redirects immediately
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings?tab=billing`,
  });

  redirect(session.url);
}