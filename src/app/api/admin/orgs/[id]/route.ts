import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/require-superadmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { users: true, subscription: true },
  });
  return NextResponse.json(org);
}

/** PATCH — SuperAdmin can update org (extend trial, change status, suspend) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  // Extend trial
  if (body.extendTrialDays) {
    const sub = await prisma.subscription.findUnique({ where: { orgId: id } });
    if (sub && sub.trialEnd) {
      const newEnd = new Date(sub.trialEnd.getTime() + body.extendTrialDays * 24 * 60 * 60 * 1000);
      await prisma.subscription.update({ where: { orgId: id }, data: { trialEnd: newEnd } });
    }
  }
  // Suspend org
  if (body.suspend === true) {
    await prisma.subscription.update({ where: { orgId: id }, data: { status: "UNPAID" } });
  }
  if (body.suspend === false) {
    await prisma.subscription.update({ where: { orgId: id }, data: { status: "ACTIVE" } });
  }
  const org = await prisma.organization.findUnique({ where: { id }, include: { subscription: true } });
  return NextResponse.json(org);
}