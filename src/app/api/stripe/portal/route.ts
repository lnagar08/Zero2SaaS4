import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. Get current organization context
    const org = await getCurrentOrg();

    // 2. Fetch the organization to get the Stripe Customer ID
    const organization = await prisma.organization.findUnique({
      where: { id: org.orgId },
      select: { stripeCustomerId: true }
    });

    if (!organization?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    // 3. Create a Stripe Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      // After managing billing, send user back to your settings page
      return_url: `${process.env.NEXTAUTH_URL}/subscription`, // Adjust this URL as needed
    });

    // 4. Return the portal URL
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
