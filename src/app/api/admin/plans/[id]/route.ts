import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/require-superadmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const PlanSchema = z.object({
  allowTeamUser: z.number().int().nonnegative("Team users cannot be negative"),
  allowMatter: z.number().int().nonnegative("Matters cannot be negative"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
  const { id } = await params; // Must await the params now

  

  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const plan = await prisma.plan.findUnique({ where: { id: id } });
  
  return NextResponse.json(plan);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    try {
        const { id } = await params;

        const plan = await prisma.plan.findUnique({ where: { id } });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (plan && plan.stripePriceId) {
            const price = await stripe.prices.retrieve(plan.stripePriceId);
            
            await stripe.prices.update(plan.stripePriceId, { active: false });

            if (price.product) {
                await stripe.products.update(price.product as string, { active: false });
            }
        }

        await prisma.plan.delete({ where: { id } });
        return NextResponse.json({ message: "Plan deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

    const body = await req.json();
    const validation = PlanSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

  try {
    const { id } = await params;
    
    const { allowMatter, allowTeamUser } = validation.data;;
    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: { allowMatter, allowTeamUser },
    });
    return NextResponse.json(updatedPlan);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}