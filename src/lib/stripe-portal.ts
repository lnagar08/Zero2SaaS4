// lib/stripe-portal.ts
"use server";

import { stripe } from "@/lib/stripe"; // Your Stripe instance
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentOrg } from "./tenant";

export async function createCustomerPortal() {
    const { orgId } = await getCurrentOrg();
    // 1. Fetch the subscription to get the Stripe Customer ID
    const subscription = await prisma.subscription.findUnique({
        where: { orgId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
        throw new Error("No active subscription found for this organization.");
    }

    // 2. Create a billing portal session in Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`, // Where to go after Stripe
    });

    // 3. Redirect the user to the Stripe-hosted URL
    redirect(portalSession.url);
}
