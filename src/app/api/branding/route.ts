import { getCurrentOrg } from "@/lib/tenant";
import { checkInternalAccount } from "@/lib/check-internal-account";
/**
 * BRANDING API
 * 
 * GET  — returns firm branding (name, color, tagline, logo text)
 * PATCH — updates firm branding
 *
 * SaaS NOTES:
 * - In production, PATCH should be restricted to OWNER role only:
 *   const { userRole } = await getCurrentOrg();
 *   if (userRole !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * - GET should use orgId from session, not hardcoded firm ID.
 * - Logo upload would be a separate endpoint that stores to S3/Supabase Storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFirmBranding, updateFirmBranding } from "@/lib/data";
import { prisma } from "@/lib/prisma";
 
export async function GET() {
  const { userRole } = await getCurrentOrg();
  if (userRole !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const branding = await getFirmBranding();
    return NextResponse.json(branding);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load branding" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {

  try {
    const { orgId, userRole } = await getCurrentOrg();
    if (userRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isInternal = await checkInternalAccount();

    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }
    
    const body = await request.json();
    const updated = await updateFirmBranding(body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
