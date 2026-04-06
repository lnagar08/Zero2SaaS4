import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest) {
  const org = await getCurrentOrg();
  const { priceId } = await req.json();
  let custId = (await prisma.organization.findUnique({ where: { id: org.orgId } }))?.stripeCustomerId;
  if (!custId) {
    const c = await stripe.customers.create({ email: org.userEmail, metadata: { orgId: org.orgId } });
    custId = c.id;
    await prisma.organization.update({ where: { id: org.orgId }, data: { stripeCustomerId: custId } });
  }
  const session = await stripe.checkout.sessions.create({
    customer: custId, mode: "subscription", line_items: [{ price: priceId, quantity: 1 }],
    success_url: process.env.NEXTAUTH_URL + "/settings/billing?success=true",
    cancel_url: process.env.NEXTAUTH_URL + "/settings/billing",
    subscription_data: { trial_period_days: 14 },
  });
  return NextResponse.json({ url: session.url });
}