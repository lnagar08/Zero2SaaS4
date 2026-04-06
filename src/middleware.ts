import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
const PUBLIC = ["/login","/signup","/forgot-password","/pricing","/api/auth","/api/stripe/webhook"];
export async function middleware(req: NextRequest) {
  if (PUBLIC.some(r => req.nextUrl.pathname.startsWith(r))) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/_next")) return NextResponse.next();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  // SuperAdmin routes — check email whitelist
  if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/api/admin")) {
    const allowed = (process.env.SUPERADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    if (!token.email || !allowed.includes(String(token.email).toLowerCase())) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };