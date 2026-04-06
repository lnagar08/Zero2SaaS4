// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { getCurrentOrg } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matterId } = await params;
    const { stepProgressId } = await request.json();
    const { orgId } = await getCurrentOrg();

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

