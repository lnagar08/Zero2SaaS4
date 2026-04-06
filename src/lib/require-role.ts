import { getCurrentOrg, type TenantContext } from "./tenant";
export async function requireRole(...roles: string[]): Promise<TenantContext> {
  const t = await getCurrentOrg();
  if (!roles.includes(t.userRole)) throw new Response("Forbidden", { status: 403 });
  return t;
}