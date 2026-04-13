// components/settings/plan-cards.tsx
"use client"

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react"; // Ensure lucide-react is installed
import { createCheckoutSession } from "@/app/actions/stripe-checkout"; // Server action to create Stripe Checkout session

// Define the structure of our plans for type safety
interface Plan {
  id: string;
  name: string;
  priceCents: number;
  amount: number;
  stripePriceId: string;
  features: string[];
  allowTeamUser: number;
}

interface PlanCardsProps {
  currentPlanId?: string; // The Stripe Price ID the user currently has
}

export function PlanCards({ currentPlanId }: PlanCardsProps) {
    
    const [loading, setLoading] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const fetchData = useCallback(async () => {
      try {
       fetch("/api/plans")
        .then(res => res.json())
        .then(data => setPlans(Array.isArray(data.plans) ? data.plans : []));
      } catch (err) { 
        console.error("Failed to load:", err); 
    }
    }, []);
  
    useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlanAction = async (priceId: string) => {
    setLoading(priceId);
    try {
      // Calls a server action to create a Stripe Checkout session
      await createCheckoutSession(priceId);
    } catch (error) {
      console.error("Payment failed", error);
      setLoading(null);
    }
  };
  const planConfigs: Record<string, { range: string }> = {
    Starter: { range: "1–2" },
    Professional: { range: "3–5" },
    Firm: { range: "6–10" },
  };
  return (
    <div className={`grid grid-cols-${plans.length} gap-4 mt-8`}>
      {plans.map((plan) => {
        const isCurrent = plan.stripePriceId === currentPlanId;
        const currentPlanAmount = plans.find(p => p.stripePriceId === currentPlanId)?.priceCents || 0;
        const isUpgrade = plan.priceCents > currentPlanAmount;
        const Range = planConfigs[plan.name]?.range || "Contact us";
        return (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 flex flex-col items-center text-center relative transition-all ${
              isCurrent 
                ? "border-2 border-[#5A38C1] shadow-md"
                : "border border-slate-100"             
            }`}
          >
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <div className="mt-4"><span className="text-4xl font-black">${plan.priceCents}</span></div>
            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">per month</p>
            <p className="text-[#5A38C1] font-bold text-sm mt-1">{Range} users</p>
            <div className="mt-6 text-sm text-slate-500 space-y-1">
              <p>All features included.</p>
              <p>Email support.</p>
            </div>
              
            <button
              disabled={isCurrent || (loading !== null)}
              onClick={() => handlePlanAction(plan.stripePriceId)}
              className={`${isCurrent
                ? "mt-auto w-full py-3 bg-[#F0F2FE] text-[#5A38C1] font-bold rounded-xl text-sm"
                : "mt-auto w-full py-3 bg-[#5A38C1] text-white font-bold rounded-xl text-sm hover:bg-[#4E2DAF]"
              }`}
            >
              {loading === plan.id ? "Processing..." : 
               isCurrent ? "Current Plan" : 
               isUpgrade ? "Upgrade" : "Downgrade"}
            </button>

          </div>
        );
      })}
      {/*
      <div className="border border-slate-100 rounded-2xl p-6 flex flex-col items-center text-center bg-[#F8FAFC]/50">
            <h3 className="font-bold text-lg">Enterprise</h3>
            <div className="mt-4"><span className="text-3xl font-black italic">Custom</span></div>
            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">pricing</p>
            <p className="text-[#5A38C1] font-bold text-sm mt-1">10+ users</p>
            <div className="mt-6 text-sm text-slate-500 space-y-1">
              <p>All features included.</p>
              <p>Custom onboarding.</p>
              <p>Dedicated account manager.</p>
            </div>
            <button className="mt-auto w-full py-3 bg-[#1A1C2E] text-white font-bold rounded-xl text-sm">Contact us</button>
          </div>
      */}
    </div>
  );
}
