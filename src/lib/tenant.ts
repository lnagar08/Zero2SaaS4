import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";
export interface TenantContext { orgId: string; orgName: string; userId: string; userName: string; userEmail: string; userRole: string; }
export async function getCurrentOrg(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { org: true } });
  if (!user) redirect("/login");
  return { orgId: user.orgId, orgName: user.org.name, userId: user.id, userName: user.name, userEmail: user.email, userRole: user.role };
}