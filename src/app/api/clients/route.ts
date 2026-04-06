import { getCurrentOrg } from "@/lib/tenant";
/**
 * CLIENTS API — Client autocomplete suggestions
 *
 * Returns distinct client name/company/email combinations from existing matters.
 * No separate clients table needed — queries matter records directly.
 *
 * SaaS NOTES:
 * - In production, scope to orgId from getCurrentOrg().
 * - When you want a full CRM-style clients table, create a clients table
 *   and link matters to it via client_id. This endpoint becomes a query
 *   on the clients table instead of DISTINCT on matters.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentFirmId } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const firmId = getCurrentOrg().orgId;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    let clients;
    if (q) {
      clients = db.prepare(
        `SELECT DISTINCT client_name, client_company, client_email 
         FROM matters WHERE firm_id = ? AND client_name LIKE ? 
         ORDER BY client_name LIMIT 10`
      ).all(firmId, `%${q}%`);
    } else {
      clients = db.prepare(
        `SELECT DISTINCT client_name, client_company, client_email 
         FROM matters WHERE firm_id = ? 
         ORDER BY client_name LIMIT 20`
      ).all(firmId);
    }

    return NextResponse.json(
      (clients as any[]).map((c) => ({
        clientName: c.client_name,
        clientCompany: c.client_company || "",
        clientEmail: c.client_email || "",
      }))
    );
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
