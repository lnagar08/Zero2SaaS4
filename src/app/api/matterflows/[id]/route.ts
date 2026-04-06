// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatterFlow, saveMatterFlow, deleteMatterFlow, reassignMattersFromFlow } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flow = getMatterFlow(id);
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
    const { id } = await params;
    const body = await request.json();
    const flow = saveMatterFlow({ ...body, id });
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
    const { id } = await params;
    const url = new URL(request.url);
    const reassignTo = url.searchParams.get("reassignTo");
    const orphan = url.searchParams.get("orphan") === "true";

    // Reassign matters before deleting the template
    if (reassignTo) {
      reassignMattersFromFlow(id, reassignTo);
    } else if (orphan) {
      reassignMattersFromFlow(id, null);
    }

    deleteMatterFlow(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
