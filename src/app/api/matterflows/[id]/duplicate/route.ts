// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { duplicateMatterFlow } from "@/lib/data";

/** POST /api/matterflows/[id]/duplicate — Create an exact copy of a MatterFlow template */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flow = await duplicateMatterFlow(id);
    return NextResponse.json(flow, { status: 201 });
  } catch (error: any) {
    console.error("Duplicate MatterFlow error:", error);
    return NextResponse.json({ error: error.message || "Failed to duplicate" }, { status: 400 });
  }
}
