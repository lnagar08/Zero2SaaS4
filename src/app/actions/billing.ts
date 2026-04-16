// lib/actions/billing.ts
"use server"
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { format } from "date-fns";

export async function getBillingData() {
  // Replace with your actual logic to get the logged-in user's stripeCustomerId
  const { orgId } = await getCurrentOrg();
  const organization = await prisma.subscription.findUnique({
    where: { orgId: orgId }
  });

  if (!organization) {
    return {
      currentPlan: {
      },
      invoices: []
    };

  }
  const customerId = organization.stripeCustomerId;

  // 1. Fetch current subscription details
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'all',
    expand: ['data.default_payment_method']
  });

  const sub = subscriptions.data[0];
  const paymentMethod = sub?.default_payment_method as any;

  // 2. Fetch last 10 invoices directly from Stripe API
  const invoicesList = await stripe.invoices.list({
    customer: customerId,
    limit: 10,
  });

   const product = await stripe.products.retrieve(sub?.items.data[0].price.product as string);

   const teamMembers = await prisma.user.count({
    where: { 
      orgId: orgId, 
      role: {
        not: "OWNER"
      },
      status: "active" 
    } 
  });

  const maxMemebrs = await prisma.plan.findUnique({
    where: { stripePriceId: sub?.items.data[0].price.id }
  });
  
  return {
    currentPlan: {
      name: product.name,
      amount: (sub?.items.data[0].plan.amount ?? 0) / 100,
      status: sub?.status || "Inactive",
      nextDate: sub ? format(new Date(sub.current_period_end * 1000), "MMM dd, yyyy") : "N/A",
      last4: paymentMethod?.card?.last4 || "0000",
      priceId: sub?.items.data[0].price.id,
      memberSince: new Date(sub.start_date * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }),
      teamMembers: teamMembers,
      maxMembers: maxMemebrs?.allowTeamUser || 0
    },
    invoices: invoicesList.data.map(inv => ({
        id: inv.id,
        date: format(new Date(inv.created * 1000), "MMM dd, yyyy"),
        description: inv.lines.data[0]?.description || "Subscription update", // Handle empty array safely
        amount: inv.total / 100,
        status: inv.status,
        // Fix: Force 'undefined' to be 'null' to match your interface
        pdf: inv.invoice_pdf ?? null 
    }))
  };
}


