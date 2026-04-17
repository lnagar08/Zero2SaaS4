// lib/actions/billing.ts
"use server"
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentOrg } from "@/lib/tenant";
import { format } from "date-fns";

export async function getBillingData() {
  try {
    // Get current organization context
    const { orgId } = await getCurrentOrg();

    // Fetch subscription record from database
    const organization = await prisma.subscription.findUnique({
      where: { orgId: orgId }
    });

    // CASE 1: No subscription record found in DB (User hasn't subscribed yet)
    if (!organization || !organization.stripeCustomerId) {
      return {
        currentPlan: {},
        invoices: [],
        error: null // This is not an error, just an empty state
      };
    }

    const customerId = organization.stripeCustomerId;

    // Fetch Subscription and Invoices in parallel to save time
    const [subscriptions, invoicesList] = await Promise.all([
      stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: 'all',
        expand: ['data.default_payment_method']
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 10,
      })
    ]);

    // CASE 2: No active subscription found on Stripe for this customer
    const sub = subscriptions.data[0];
    if (!sub) {
      return {
        currentPlan: {},
        invoices: [],
        error: null
      };
    }

    const paymentMethod = sub?.default_payment_method as any;

    // Fetch product details to get the Plan Name
    const product = await stripe.products.retrieve(sub?.items.data[0].price.product as string);

    // Get team member count for the current organization
    const teamMembers = await prisma.user.count({
      where: { 
        orgId: orgId, 
        role: { not: "OWNER" },
        status: "active" 
      } 
    });

    // Get max member limit from the internal Plan table using the Stripe Price ID
    const maxMemebrs = await prisma.plan.findUnique({
      where: { stripePriceId: sub?.items.data[0].price.id }
    });
    
    // Return structured data for the UI
    return {
      currentPlan: {
        name: product.name,
        amount: (sub?.items.data[0].plan.amount ?? 0) / 100,
        status: sub?.status || "Inactive",
        nextDate: sub ? format(new Date(sub.current_period_end * 1000), "MMM dd, yyyy") : "N/A",
        last4: paymentMethod?.card?.last4 || "0000",
        priceId: sub?.items.data[0].price.id,
        memberSince: new Date(sub.start_date * 1000).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        }),
        teamMembers: teamMembers,
        maxMembers: maxMemebrs?.allowTeamUser || 0
      },
      // Safely map invoices, handle case where list might be empty
      invoices: (invoicesList.data || []).map(inv => ({
          id: inv.id,
          date: format(new Date(inv.created * 1000), "MMM dd, yyyy"),
          description: inv.lines.data[0]?.description || "Subscription update",
          amount: inv.total / 100,
          status: inv.status,
          pdf: inv.invoice_pdf ?? null 
      })),
      error: null
    };

  } catch (error) {
    // CASE 3: Handle unexpected API failures (Stripe down, DB connection issue, etc.)
    console.error("Critical Billing Fetch Error:", error);
    return {
      currentPlan: null,
      invoices: [],
      error: "Unable to load billing data. Please try again later."
    };
  }
}
