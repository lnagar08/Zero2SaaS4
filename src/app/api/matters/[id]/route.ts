// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatter, updateMatter, deleteMatter } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getCurrentOrg } from "@/lib/tenant";
import { hasPermission } from "@/lib/check-permission";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const canAddMatter = await hasPermission("viewMatter");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to update matter." },
        { status: 403 }
      );
    }
    const { id } = await params;
    const matter = await getMatter(id);
    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 });
    }
    return NextResponse.json(matter);
  } catch (error) {
    console.error("Matter GET error:", error);
    return NextResponse.json({ error: "Failed to load matter" }, { status: 500 });
  }
}

export async function PATCH(
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

    const { orgId } = await getCurrentOrg();

    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const matter = await updateMatter(id, body);
    return NextResponse.json(matter);
  } catch (error: any) {
    console.error("Matter PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const canAddMatter = await hasPermission("deleteMatter");
    if (!canAddMatter) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to deleted matters." },
        { status: 403 }
      );
    }

    const { orgId } = await getCurrentOrg();
    
    const isInternal = await checkInternalAccount();
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }
    
    const { id } = await params;
    await deleteMatter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Matter DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete matter" }, { status: 500 });
  }
}
