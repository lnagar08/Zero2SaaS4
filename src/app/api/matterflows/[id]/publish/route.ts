// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/matterflows/[id]/publish — Toggle publish/unpublish
 *
 * SaaS NOTE: In production, publishing should:
 * 1. Deep-clone the workflow (stages + steps) into a shared PublishedWorkflow table
 * 2. Set authorOrgId, authorName, category, and publishedAt
 * 3. The PublishedWorkflow table is visible to ALL orgs (no orgId filter)
 * 4. Unpublishing deletes from PublishedWorkflow but keeps the private copy
 * 5. Edits to the private copy do NOT auto-update the published version
 * 6. The local is_public flag on matter_flows can remain as a convenience indicator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare("SELECT * FROM matter_flows WHERE id = ?").get(id) as any;
    if (!row) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const newValue = row.is_public ? 0 : 1;
    const publishedAt = newValue ? new Date().toISOString() : null;
    db.prepare("UPDATE matter_flows SET is_public = ?, published_at = ?, updated_at = ? WHERE id = ?")
      .run(newValue, publishedAt, new Date().toISOString(), id);

    return NextResponse.json({ isPublic: !!newValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
