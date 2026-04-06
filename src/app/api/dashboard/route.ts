// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextResponse } from "next/server";
import { getMattersWithHealth } from "@/lib/data";
import type { DashboardSummary } from "@/types";

export async function GET() {
  try {
    const matters = await getMattersWithHealth();

    const summary: DashboardSummary = {
      totalActive: matters.length,
      inFlow: matters.filter((m) => m.health.status === "in_flow").length,
      atFlowRisk: matters.filter((m) => m.health.status === "at_flow_risk").length,
      outOfFlow: matters.filter((m) => m.health.status === "out_of_flow").length,
      flowBreakdown: matters.filter((m) => m.health.status === "flow_breakdown").length,
      matters,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
