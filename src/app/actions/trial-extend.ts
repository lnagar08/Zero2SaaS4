"use server"
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function extendTrial(orgId: string, monthsToAdd: number) {
    try {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true }
  });

  if (!org?.subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  // 1. existing trial end date
  const currentEnd = org.subscription.trialEnd ? new Date(org.subscription.trialEnd) : new Date();
  const newTrialEnd = new Date(currentEnd);
  newTrialEnd.setMonth(newTrialEnd.getMonth() + monthsToAdd);

  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

  if (newTrialEnd > twoYearsFromNow) {
     return { error: "You cannot extend the trial more than 2 years from today." };
  }

  const unixTimestamp = Math.floor(newTrialEnd.getTime() / 1000);

  // Stripe update
  await stripe.subscriptions.update(org.subscription.stripeSubscriptionId, {
    trial_end: unixTimestamp,
  });

  // DB update
  await prisma.subscription.update({
    where: { orgId: orgId },
    data: { trialEnd: newTrialEnd },
  });

  return { success: true };
  } catch (e) {
    return { error: "Something went wrong" };
  }
}
