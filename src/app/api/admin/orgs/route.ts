import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/require-superadmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { users: true } }, subscription: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orgs);
}