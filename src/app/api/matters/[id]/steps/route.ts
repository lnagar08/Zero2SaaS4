// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { toggleStepCompletion } from "@/lib/data";
import { getCurrentOrg } from "@/lib/tenant";
import { checkInternalAccount } from "@/lib/check-internal-account";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { orgId } = await getCurrentOrg();
        
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const { id } = await params;
    const { stepProgressId } = await request.json();
    const result = await toggleStepCompletion(id, stepProgressId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Step toggle error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle step" }, { status: 400 });
  }
}
