import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const t = await getCurrentOrg();
  const members = await prisma.user.findMany({ where: { orgId: t.orgId }, select: { id: true, name: true, email: true, role: true } });
  return NextResponse.json(members);
}