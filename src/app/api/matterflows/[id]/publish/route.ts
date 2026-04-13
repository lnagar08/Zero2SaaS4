import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await getCurrentOrg(); // Tenant Check
    
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const flow = await prisma.matterFlow.findFirst({
      where: { id, orgId },
    });

    if (!flow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const newIsPublic = !flow.isPublic;
    
    const publishedAt = newIsPublic ? new Date() : null; 

    const updated = await prisma.matterFlow.update({
      where: { id },
      data: {
        isPublic: newIsPublic,
        publishedAt: publishedAt,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      isPublic: updated.isPublic,
      publishedAt: updated.publishedAt 
    });

  } catch (error: any) {
    console.error("Visibility Toggle Error:", error);
    return NextResponse.json(
      { error: "Failed to update visibility" }, 
      { status: 400 }
    );
  }
}
