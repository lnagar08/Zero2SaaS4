import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await getCurrentOrg();

    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const flow = await prisma.matterFlow.findFirst({
      where: { id, orgId }
    });
    if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newValue = !flow.isDefault;

    if (newValue) {
      await prisma.matterFlow.updateMany({
        where: { orgId, id: { not: id } },
        data: { isDefault: false }
      });
    }

    await prisma.matterFlow.update({
      where: { id },
      data: { isDefault: newValue, updatedAt: new Date() }
    });

    return NextResponse.json({ isDefault: newValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}