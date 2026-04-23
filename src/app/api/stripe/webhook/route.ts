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
        create: { orgId, stripeSubscriptionId: sub.id, stripeCustomerId: customer.id as string, stripePriceId: sub.items.data[0].price.id, status: sub.status === "trialing" ? "TRIALING" : "ACTIVE", currentPeriodStart: new Date(sub.current_period_start*1000), currentPeriodEnd: new Date(sub.current_period_end*1000), trialEnd: sub.trial_end ? new Date(sub.trial_end*1000) : null },
        update: { stripeSubscriptionId: sub.id, stripePriceId: sub.items.data[0].price.id, status: sub.status === "trialing" ? "TRIALING" : "ACTIVE", currentPeriodStart: new Date(sub.current_period_start*1000), currentPeriodEnd: new Date(sub.current_period_end*1000), trialEnd: sub.trial_end ? new Date(sub.trial_end*1000) : null },
      }); 

      await prisma.organization.update({
        where: { id: orgId },
        data: { hasUsedTrial: true }
      });

      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (!existing) break;
      const statusMap: Record<string,string> = { trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", canceled: "CANCELED", unpaid: "UNPAID" };
      await prisma.subscription.update({ where: { orgId: sub.metadata.orgId }, 
        data: { 
          status: (statusMap[sub.status] || "ACTIVE") as any, 
          stripePriceId: sub.items.data[0].price.id, 
          currentPeriodStart: new Date(sub.current_period_start * 1000), 
          currentPeriodEnd: new Date(sub.current_period_end * 1000), 
          cancelAtPeriodEnd: sub.cancel_at_period_end || false, 
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null 
        } 
      });
      break;
    }
    // --- NEW CASE: TO TRACK TRANSACTIONS ---
    case "invoice.paid": {
      const invoice = event.data.object as any;
      
      // 1. Get organization linked to this Stripe Customer
      const orgId = invoice.lines.data[0]?.metadata?.orgId || 
                invoice.subscription_details?.metadata?.orgId;

      if (!orgId) {
        console.error("OrgId missing in Stripe Metadata");
        break;
      }
   
        // 2. Save the transaction to Database
        await prisma.transaction.create({
          data: {
            orgId: orgId,
            amount: invoice.amount_paid / 100, 
            currency: invoice.currency.toUpperCase(), 
            status: invoice.status === "paid" ? "succeeded" : invoice.status, 
            stripePaymentId: invoice.payment_intent || invoice.id || "N/A",
            stripePriceId: invoice.lines.data[0]?.pricing?.price_details?.price || '', 
            type: invoice.billing_reason || "plan_update", 
          },
        });
      
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await prisma.subscription.updateMany({ where: { orgId: sub.metadata.orgId }, data: { status: "CANCELED" } });
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