// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { advanceStage } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getCurrentOrg();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }
    const { id } = await params;
    const matter = await advanceStage(id);
    return NextResponse.json(matter);
  } catch (error: any) {
    console.error("Advance stage error:", error);
    return NextResponse.json({ error: error.message || "Failed to advance stage" }, { status: 400 });
  }
}
