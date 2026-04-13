// app/api/plans/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";

export async function GET() {
  try {
    const { orgId } = await getCurrentOrg();
    
    // Fetch all available plans
    const plans = await prisma.plan.findMany({
      orderBy: { priceCents: "asc" }
    });

    // Fetch current organization's subscription to identify the active plan
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { subscription: true }
    });

    return NextResponse.json({ 
      plans, 
      currentPriceId: organization?.subscription?.stripePriceId 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
