// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatterFlows, saveMatterFlow } from "@/lib/data";

export async function GET() {
  try {
    const flows = getMatterFlows();
    return NextResponse.json(flows);
  } catch (error) {
    console.error("MatterFlows GET error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const flow = saveMatterFlow(body);
    return NextResponse.json(flow, { status: 201 });
  } catch (error: any) {
    console.error("MatterFlows POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 400 });
  }
}
