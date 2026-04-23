// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { applyMatterFlowToExistingMatters, getActiveMattersCountForFlow } from "@/lib/data";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { checkInternalAccount } from "@/lib/check-internal-account";
/** GET /api/matterflows/[id]/apply — Get count of matters that would be affected */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const count = await getActiveMattersCountForFlow(id);
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to count" }, { status: 400 });
  }
}

/** POST /api/matterflows/[id]/apply — Apply template changes to all active matters */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getCurrentOrg(); // Tenant Check
        
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }
    
    const { id } = await params;
    const updatedCount = await applyMatterFlowToExistingMatters(id);
    return NextResponse.json({ updatedCount });
  } catch (error: any) {
    console.error("Apply MatterFlow error:", error);
    return NextResponse.json({ error: error.message || "Failed to apply" }, { status: 400 });
  }
}
