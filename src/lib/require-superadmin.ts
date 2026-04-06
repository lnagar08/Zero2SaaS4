import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";

/**
 * Check if current user is a SuperAdmin (platform owner).
 * SuperAdmin emails are set in SUPERADMIN_EMAILS env var (comma-separated).
 * Returns the user email if authorized, redirects to / if not.
 */
export async function requireSuperAdmin(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const allowed = (process.env.SUPERADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  if (!allowed.includes(session.user.email.toLowerCase())) redirect("/");
  return session.user.email;
}

/** Check if an email is a SuperAdmin (for use in middleware/API routes) */
export function isSuperAdminEmail(email: string): boolean {
  const allowed = (process.env.SUPERADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}