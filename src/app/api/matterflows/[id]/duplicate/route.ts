// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { duplicateMatterFlow } from "@/lib/data";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { checkInternalAccount } from "@/lib/check-internal-account";

/** POST /api/matterflows/[id]/duplicate — Create an exact copy of a MatterFlow template */
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
    const flow = await duplicateMatterFlow(id);
    return NextResponse.json(flow, { status: 201 });
  } catch (error: any) {
    console.error("Duplicate MatterFlow error:", error);
    return NextResponse.json({ error: error.message || "Failed to duplicate" }, { status: 400 });
  }
}
