// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatterFlow, saveMatterFlow, deleteMatterFlow, reassignMattersFromFlow } from "@/lib/data";
 import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/check-permission";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    
    const { id } = await params;
    const flow = await getMatterFlow(id);
    if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(flow);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();
    const flow = await saveMatterFlow({ ...body, id });
    return NextResponse.json(flow);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 400 });
  }
}

/**
 * DELETE /api/matterflows/[id]
 * Deletes a MatterFlow template.
 * Optional query params:
 *   ?reassignTo=<flowId> — reassign active matters to another template before deleting
 *   ?orphan=true — set matters to null (displays as "Custom") before deleting
 * If neither is provided and active matters exist, matters become orphaned.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const canAddMatter = await hasPermission("deleteWorkflows");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to deleted Workflows." },
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

    const { id } = await params;
    const url = new URL(request.url);
    const reassignTo = url.searchParams.get("reassignTo");
    const orphan = url.searchParams.get("orphan") === "true";

    // Reassign matters before deleting the template
    if (reassignTo) {
      await reassignMattersFromFlow(id, reassignTo);
    } else if (orphan) {
      await reassignMattersFromFlow(id, null);
    }

    await deleteMatterFlow(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
