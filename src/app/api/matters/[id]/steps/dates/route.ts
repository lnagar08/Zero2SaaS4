// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * SaaS NOTE: Convert to Prisma:
 * - prisma.matterStepProgress.findUnique({ where: { id: stepProgressId } })
 * - prisma.matterStepProgress.update({ where: { id }, data: { manualDueDate, completedAt } })
 * - Add orgId check to ensure the step belongs to the current org
 *//** PATCH /api/matters/[id]/steps/dates — Update manual due date or completion date on a step */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stepProgressId, manualDueDate, completedAt } = await request.json();
    const db = getDb();

    const row = db.prepare("SELECT * FROM matter_step_progress WHERE id = ?").get(stepProgressId) as any;
    if (!row) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    if (manualDueDate !== undefined) {
      db.prepare("UPDATE matter_step_progress SET manual_due_date = ? WHERE id = ?").run(manualDueDate || null, stepProgressId);
    }
    if (completedAt !== undefined) {
      db.prepare("UPDATE matter_step_progress SET completed_at = ? WHERE id = ?").run(completedAt || null, stepProgressId);
    }

    db.prepare("UPDATE matters SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
