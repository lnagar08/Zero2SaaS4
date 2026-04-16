import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
export async function GET() {
  const t = await getCurrentOrg();
  const members = await prisma.user.findMany({ 
    where: { 
      orgId: t.orgId,
      role: {
        not: "OWNER"
      }
    }, select: { id: true, name: true, email: true, role: true, permissions: true } });
  return NextResponse.json(members);
}


export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = await getCurrentOrg();
      // 1. Authenticate and check if the user is an OWNER
      const session = await getServerSession(authOptions);
  
      if (!session || session.user.role !== "OWNER") {
        return NextResponse.json({ error: "Unauthorized. Only owners can invite." }, { status: 401 });
      }
  
      if (!orgId) {
        return NextResponse.json({ error: "Organization ID is missing." }, { status: 400 });
      }

      const body = await req.json();
      const { memberId, permissions } = body;
      
      if (!memberId) {
        return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
      }

      const member = await prisma.user.findUnique({ where: { id: memberId } });
      if (!member || member.orgId !== orgId) {
        return NextResponse.json({ error: "Member not found in your organization." }, { status: 404 });
      }
      
      await prisma.user.update({
        where: { id: memberId },
        data: { permissions }
      });
      return NextResponse.json({ message: "Permissions updated successfully." });
  } catch (error) {
    console.error("Error updating member permissions:", error);
    return NextResponse.json({ error: "An error occurred while updating permissions." }, { status: 500 });
  }
}