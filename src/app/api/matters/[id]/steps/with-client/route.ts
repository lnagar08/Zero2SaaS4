// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { getCurrentOrg } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/check-permission";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const canAddMatter = await hasPermission("editMatter");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to update matters." },
        { status: 403 }
      );
    }

    const { id: matterId } = await params;
    const { stepProgressId } = await request.json();
    const { orgId } = await getCurrentOrg();
            
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const row = await prisma.matterStepProgress.findUnique({
      where: { id: stepProgressId, orgId },
    });

    if (!row) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const newValue = !row.withClient;
    const since = newValue ? new Date().toISOString() : null;

    const result = await prisma.$transaction(async (tx) => {
      const updatedStep = await tx.matterStepProgress.update({
        where: { id: stepProgressId },
        data: {
          withClient: newValue,
          withClientSince: since,
        },
      });

      await tx.matter.update({
        where: { id: matterId },
        data: { updatedAt: new Date() },
      });

      return updatedStep;
    });

    return NextResponse.json({ withClient: result.withClient });
  } catch (error: any) {
    console.error("Toggle withClient error:", error);
    return NextResponse.json(
      { error: error.message || "Failed" }, 
      { status: 400 }
    );
  }
}

