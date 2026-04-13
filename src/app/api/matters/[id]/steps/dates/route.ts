import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matterId } = await params; // Matter ID
    const { orgId } = await getCurrentOrg(); // Tenant Check
    
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const { stepProgressId, manualDueDate, completedAt } = await request.json();

    
    await prisma.$transaction(async (tx) => {
      
      
      const step = await tx.matterStepProgress.update({
        where: { 
          id: stepProgressId,
          orgId: orgId 
        },
        data: {
          manualDueDate: manualDueDate !== undefined ? (manualDueDate ? new Date(manualDueDate) : null) : undefined,
          completedAt: completedAt !== undefined ? (completedAt ? new Date(completedAt) : null) : undefined,
        }
      });

      if (!step) throw new Error("Step not found or unauthorized");

      await tx.matter.update({
        where: { id: matterId, orgId },
        data: { updatedAt: new Date() }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Update Step Error:", error);
    const status = error.message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: error.message || "Failed" }, { status });
  }
}
