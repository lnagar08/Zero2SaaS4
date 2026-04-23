// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatters, createMatter } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { hasPermission } from "@/lib/check-permission";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET() {
  try {
    const matters = await getMatters();
    return NextResponse.json(matters);
  } catch (error) {
    console.error("Matters GET error:", error);
    return NextResponse.json({ error: "Failed to load matters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const canAddMatter = await hasPermission("addMatter");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to add matters." },
        { status: 403 }
      );
    }
    
    const { orgId } = await getCurrentOrg();
    const isInternal = await checkInternalAccount();

    if (!isInternal){
      
      const sub = await prisma.subscription.findUnique({
        where: { orgId },
      });
      if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
        return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
      }

      const totalMatter = await prisma.matter.count({
        where:{
          orgId
        }
      });

      
      const maxMatter = await prisma.plan.findUnique({
        where: { stripePriceId: sub.stripePriceId }
      });
      
      const isTrialing = sub.status === "TRIALING"; 
      if(!isTrialing){
        // Check if the plan has a limit and if the user has reached it
        if (maxMatter?.allowMatter && totalMatter >= maxMatter.allowMatter) {
          // If the current count is equal to or more than allowed, block creation
          return NextResponse.json({ error: "Matter limit reached for your plan." }, { status: 403 });
        }
      }
      

    }
    
    const body = await request.json();
    const matter = await createMatter(body);
    return NextResponse.json(matter, { status: 201 });
  } catch (error: any) {
    console.error("Matters POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create matter" }, { status: 400 });
  }
}
