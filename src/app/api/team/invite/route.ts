import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest) {
  const t = await getCurrentOrg();
  const { email, role } = await req.json();
  const inv = await prisma.invitation.create({ data: { orgId: t.orgId, email, role: role || "MEMBER", expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  return NextResponse.json({ inviteLink: "/signup?invite=" + inv.token });
}