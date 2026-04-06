// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * SaaS NOTE: Convert to Prisma:
 * - prisma.matterStepProgress.findUnique({ where: { id: stepProgressId } })
 * - prisma.matterStepProgress.update({ where: { id }, data: { withClient, withClientSince } })
 * - Add orgId check to ensure the step belongs to the current org
 */export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stepProgressId } = await request.json();
    const db = getDb();

    const row = db.prepare("SELECT * FROM matter_step_progress WHERE id = ?").get(stepProgressId) as any;
    if (!row) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const newValue = row.with_client ? 0 : 1;
    const since = newValue ? new Date().toISOString() : null;
    db.prepare("UPDATE matter_step_progress SET with_client = ?, with_client_since = ? WHERE id = ?").run(newValue, since, stepProgressId);
    db.prepare("UPDATE matters SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);

    return NextResponse.json({ withClient: !!newValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
