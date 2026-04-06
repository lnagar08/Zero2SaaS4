import { getCurrentOrg } from "@/lib/tenant";
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

export async function GET() {
  try {
    const branding = getFirmBranding();
    return NextResponse.json(branding);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load branding" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateFirmBranding(undefined, body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
