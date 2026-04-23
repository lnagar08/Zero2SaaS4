// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatterFlows, saveMatterFlow } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { hasPermission } from "@/lib/check-permission";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET() {
  try {
    const flows = await getMatterFlows();
    return NextResponse.json(flows);
  } catch (error) {
    console.error("MatterFlows GET error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    
    const canAddMatter = await hasPermission("addWorkflows");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to add Workflows." },
        { status: 403 }
      );
    }

    const { orgId } = await getCurrentOrg();
    
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const body = await request.json();
    const flow = await saveMatterFlow(body);
    return NextResponse.json(flow, { status: 201 });
  } catch (error: any) {
    console.error("MatterFlows POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 400 });
  }
}
