// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getFlowControls, updateFlowControls } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET() {
  try {
    const controls = await getFlowControls();
    return NextResponse.json(controls);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) { 
  try {
    const { orgId } = await getCurrentOrg();
    
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }
    
    const body = await request.json();
    const controls = await updateFlowControls(body);
    return NextResponse.json(controls);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 400 });
  }
}
