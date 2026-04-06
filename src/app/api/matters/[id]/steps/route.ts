// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { toggleStepCompletion } from "@/lib/data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stepProgressId } = await request.json();
    const result = toggleStepCompletion(id, stepProgressId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Step toggle error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle step" }, { status: 400 });
  }
}
