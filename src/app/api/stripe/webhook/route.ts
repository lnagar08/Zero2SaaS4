import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      if (!session.subscription) break;
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const customer = await stripe.customers.retrieve(session.customer as string) as any;
      const orgId = customer.metadata?.orgId;
      if (!orgId) { console.error("No orgId in customer metadata"); break; }
      await prisma.subscription.upsert({
        where: { orgId },
        create: { orgId, stripeSubscriptionId: sub.id, stripePriceId: sub.items.data[0].price.id, status: sub.status === "trialing" ? "TRIALING" : "ACTIVE", currentPeriodStart: new Date(sub.current_period_start*1000), currentPeriodEnd: new Date(sub.current_period_end*1000), trialEnd: sub.trial_end ? new Date(sub.trial_end*1000) : null },
        update: { stripeSubscriptionId: sub.id, stripePriceId: sub.items.data[0].price.id, status: sub.status === "trialing" ? "TRIALING" : "ACTIVE", currentPeriodStart: new Date(sub.current_period_start*1000), currentPeriodEnd: new Date(sub.current_period_end*1000), trialEnd: sub.trial_end ? new Date(sub.trial_end*1000) : null },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (!existing) break;
      const statusMap: Record<string,string> = { trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", canceled: "CANCELED", unpaid: "UNPAID" };
      await prisma.subscription.update({ where: { stripeSubscriptionId: sub.id }, data: { status: (statusMap[sub.status] || "ACTIVE") as any, stripePriceId: sub.items.data[0].price.id, currentPeriodStart: new Date(sub.current_period_start*1000), currentPeriodEnd: new Date(sub.current_period_end*1000), cancelAtPeriodEnd: sub.cancel_at_period_end || false, trialEnd: sub.trial_end ? new Date(sub.trial_end*1000) : null } });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await prisma.subscription.updateMany({ where: { stripeSubscriptionId: sub.id }, data: { status: "CANCELED" } });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      if (invoice.subscription) { await prisma.subscription.updateMany({ where: { stripeSubscriptionId: invoice.subscription }, data: { status: "PAST_DUE" } }); }
      break;
    }
  }
  return NextResponse.json({ received: true });
}