import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/require-superadmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { stripe } from "@/lib/stripe";

const PlanSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  priceCents: z.number().int().positive("Price must be a positive number"),
  allowTeamUser: z.number().int().nonnegative("Team users cannot be negative"),
  allowMatter: z.number().int().nonnegative("Matters cannot be negative"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  const body = await request.json();
  const validation = PlanSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { errors: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  try {
    const { name, priceCents, allowTeamUser, allowMatter } = validation.data;
  
    const product = await stripe.products.create({ name: name });
    stripeProductId = product.id;

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: "usd",
      recurring: { interval: "month" },
    });
    stripePriceId = price.id;

    const plan = await prisma.plan.create({
      data: {
        name,
        priceCents: priceCents / 100,
        stripePriceId: price.id,
        stripeProductId: product.id,
        allowTeamUser,
        allowMatter,
      }
    });

    const plans = await prisma.plan.findMany({
      select: {
        stripeProductId: true,
        stripePriceId: true,
      },
    });

    const productsToShow = plans.map((plan) => ({
      product: plan.stripeProductId as string,
      prices: [plan.stripePriceId as string],
    }));

    const updatedConfig = await stripe.billingPortal.configurations.update(
      process.env.STRIPE_PORTAL_CONFIG!,
      {
        features: {
          subscription_update: {
            enabled: true,
            products: productsToShow,
          },
        },
      }
    );

    return NextResponse.json({ status: 201, message: "Plan created successfully" });
  } catch (error) {
    console.error("Transaction Error:", error);
    if (stripeProductId) {
      await stripe.products.update(stripeProductId, { active: false });
    }

    return NextResponse.json(
      { error: "Failed to create plan. Stripe data rolled back." },
      { status: 500 }
    );
  }


  
}