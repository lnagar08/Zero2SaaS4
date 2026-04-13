"use client" // Add this at the top

import { useEffect, useState } from "react";
import { PlanCards } from "./plan-cards";
import { InvoiceHistory } from "./invoice-history";
import PlansSkeleton from './PlansSkeleton';
import { getBillingData } from "@/app/actions/billing"; // Keep your server action
import { createPortalSession } from "@/app/actions/stripe-portal"; // Server action for Stripe Portal

export function BillingTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const billingData = await getBillingData();
        setData(billingData);
      } catch (error) {
        console.error("Failed to load billing", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <PlansSkeleton />;
  if (!data) return <div className="p-10 text-center">Error loading data.</div>;

  const { currentPlan, invoices } = data;
 
  let userLimit = '';
  if(currentPlan.name === "Starter"){
    userLimit = `1-${currentPlan.maxMembers}`;
  }else if(currentPlan.name === 'Professional'){
    userLimit = `3-${currentPlan.maxMembers}`;
  }else if(currentPlan.name === 'Firm'){
    userLimit = `6-${currentPlan.maxMembers}`;
  }else{
    userLimit = 'Custom'; 
  }
  return (
    <div className="space-y-10">
      {/* SECTION 1: CURRENT PLAN */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        {!currentPlan || Object.keys(currentPlan).length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-md">
                You are not currently on a paid plan.
            </div>
         ) : ( 
            <>
            <div className="flex justify-between items-start mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{currentPlan.name}</h2>
                <p className="text-slate-500 mt-1">${currentPlan.amount} / month · {userLimit} users</p>
            </div>
            <span className="bg-[#F0F2FE] text-[#5A38C1] text-sm font-bold px-4 py-1.5 rounded-lg capitalize">{currentPlan.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-6 mb-8">
            <div>
                <p className="text-sm text-slate-400 font-medium">Next billing date</p>
                <p className="text-lg font-bold mt-1">{currentPlan.nextDate}</p>
            </div>
            <div>
                <p className="text-sm text-slate-400 font-medium">Payment method</p>
                <p className="text-lg font-bold mt-1">Visa ending in {currentPlan.last4}</p>
            </div>
            <div>
                <p className="text-sm text-slate-400 font-medium">Team members</p>
                <p className="text-lg font-bold mt-1">{currentPlan.maxMembers} of {currentPlan.teamMembers} seats used</p>
            </div>
            <div>
                <p className="text-sm text-slate-400 font-medium">Member since</p>
                <p className="text-lg font-bold mt-1">{currentPlan.memberSince}</p>
            </div>
            </div>
            <form action={createPortalSession}>
                <button type="submit" className="px-6 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
                    Manage payment method
                </button>
            </form>
            
        </>
         )}
      </section>

      {/* SECTION 2: AVAILABLE PLANS */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Available plans</h2>
        <p className="text-slate-400 text-sm mt-1">All plans include every feature. Only seats and support level differ. Upgrade or downgrade anytime.</p>
        <PlanCards currentPlanId={currentPlan.priceId} />
        <p className="mt-8 text-center text-[13px] text-slate-500 leading-relaxed border-t border-slate-100 pt-[20px]">
          <span className="font-bold text-slate-900">Every plan includes:</span> Unlimited matters, flow health dashboard, revenue at risk tracking, command center, associate comparison, client portal, workflow library, daily backup reports
        </p>
      </section>

      {/* SECTION 3: BILLING HISTORY */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Billing history</h2>
        <p className="text-slate-400 text-sm mt-1 mb-8">Invoices from Stripe. Click to download PDF.</p>
        <InvoiceHistory invoices={invoices} />
      </section>
    </div>
  );
}
