// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { advanceStage } from "@/lib/data";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matter = await advanceStage(id);
    return NextResponse.json(matter);
  } catch (error: any) {
    console.error("Advance stage error:", error);
    return NextResponse.json({ error: error.message || "Failed to advance stage" }, { status: 400 });
  }
}
