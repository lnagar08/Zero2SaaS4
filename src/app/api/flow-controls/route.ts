// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getFlowControls, updateFlowControls } from "@/lib/data";

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
    const body = await request.json();
    const controls = await updateFlowControls(body);
    return NextResponse.json(controls);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 400 });
  }
}
