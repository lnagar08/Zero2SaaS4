import { getCurrentOrg } from "@/lib/tenant";
/**
 * COMMAND CENTER API
 * 
 * Computes firm-wide analytics from matter data:
 * - Avg days to close, flow rate, bottleneck stage, closed count
 * - Stage performance (avg days per stage)
 * - Associate comparison (active, avg days, flow rate, closed)
 * - Aging matters (longest without activity)
 *
 * SaaS NOTES:
 * - In production, restrict this endpoint to OWNER role only:
 *   const { userRole } = await getCurrentOrg();
 *   if (userRole !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * - Cache these computations — they're expensive on large datasets.
 *   Consider a background job that pre-computes metrics hourly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMattersWithHealth, getMatterFlows, getUsers, getCurrentFirmId } from "@/lib/data";
import { getDb } from "@/lib/db";
import type { MatterWithHealth } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const firmId = getCurrentOrg().orgId;
    const db = getDb();
    const matters = getMattersWithHealth();
    const flows = getMatterFlows();
    const users = getUsers();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const flowFilter = searchParams.get("flowId") || "";
    const period = parseInt(searchParams.get("period") || "90");

    // Filter by MatterFlow type if specified
    let filtered = matters;
    if (flowFilter) {
      filtered = filtered.filter((m) => m.matterFlowId === flowFilter);
    }

    // Get closed matters for period calculations
    const allMatters = db.prepare(
      "SELECT * FROM matters WHERE firm_id = ?"
    ).all(firmId) as any[];

    const closedMatters = allMatters.filter((m: any) => m.status === "completed");
    const periodCutoff = new Date();
    periodCutoff.setDate(periodCutoff.getDate() - period);

    const closedInPeriod = closedMatters.filter((m: any) => {
      if (!m.updated_at) return false;
      return new Date(m.updated_at) >= periodCutoff;
    });

    // Apply flow filter to closed matters too
    const closedFiltered = flowFilter
      ? closedInPeriod.filter((m: any) => m.matter_flow_id === flowFilter)
      : closedInPeriod;

    // ── Metric 1: Avg days to close ──
    let avgDaysToClose = 0;
    if (closedFiltered.length > 0) {
      const totalDays = closedFiltered.reduce((sum: number, m: any) => {
        const start = new Date(m.created_at);
        const end = new Date(m.updated_at);
        return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      avgDaysToClose = Math.round(totalDays / closedFiltered.length);
    }

    // ── Metric 2: Flow rate ──
    const inFlowCount = filtered.filter((m) => m.health.status === "in_flow").length;
    const flowRate = filtered.length > 0 ? Math.round((inFlowCount / filtered.length) * 100) : 0;

    // ── Metric 3: Bottleneck stage ──
    const stageDays: Record<string, { name: string; totalDays: number; count: number }> = {};
    for (const m of filtered) {
      for (const sp of m.stageProgress) {
        if (sp.startedAt && !sp.completedAt) {
          const days = Math.round((Date.now() - new Date(sp.startedAt).getTime()) / (1000 * 60 * 60 * 24));
          if (!stageDays[sp.stageName]) stageDays[sp.stageName] = { name: sp.stageName, totalDays: 0, count: 0 };
          stageDays[sp.stageName].totalDays += days;
          stageDays[sp.stageName].count++;
        }
      }
    }
    const stageArr = Object.values(stageDays).map((s) => ({ ...s, avg: Math.round(s.totalDays / s.count) }));
    stageArr.sort((a, b) => b.avg - a.avg);
    const bottleneck = stageArr[0] || { name: "None", avg: 0 };

    // ── Metric 4: Closed this month ──
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const closedThisMonth = closedFiltered.filter((m: any) => new Date(m.updated_at) >= monthStart).length;

    // ── Stage performance ──
    const stagePerf: { name: string; avgDays: number; maxExpected: number }[] = [];
    const allStageNames = new Set<string>();
    for (const m of filtered) {
      for (const sp of m.stageProgress) {
        allStageNames.add(sp.stageName);
      }
    }
    for (const name of allStageNames) {
      let total = 0;
      let count = 0;
      let maxExpected = 10;
      for (const m of filtered) {
        for (const sp of m.stageProgress) {
          if (sp.stageName !== name) continue;
          if (sp.startedAt) {
            const end = sp.completedAt ? new Date(sp.completedAt) : new Date();
            const days = Math.round((end.getTime() - new Date(sp.startedAt).getTime()) / (1000 * 60 * 60 * 24));
            total += days;
            count++;
          }
          if (sp.expectedDurationDays) maxExpected = sp.expectedDurationDays;
        }
      }
      if (count > 0) {
        stagePerf.push({ name, avgDays: Math.round(total / count), maxExpected });
      }
    }
    stagePerf.sort((a, b) => b.avgDays - a.avgDays);

    // ── Associate comparison ──
    const assocStats = users.map((u) => {
      const userMatters = filtered.filter((m) => m.assignedUserId === u.id);
      const userClosed = closedFiltered.filter((m: any) => m.assigned_user_id === u.id);
      const userInFlow = userMatters.filter((m) => m.health.status === "in_flow").length;

      let userAvgDays = 0;
      if (userClosed.length > 0) {
        const total = userClosed.reduce((sum: number, m: any) => {
          const start = new Date(m.created_at);
          const end = new Date(m.updated_at);
          return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);
        userAvgDays = Math.round(total / userClosed.length);
      }

      return {
        id: u.id,
        name: u.name,
        initials: u.name.split(" ").map((n) => n[0]).join("").toUpperCase(),
        active: userMatters.length,
        avgDays: userAvgDays,
        flowRate: userMatters.length > 0 ? Math.round((userInFlow / userMatters.length) * 100) : 0,
        closed: userClosed.length,
      };
    });

    // ── Aging matters ──
    const aging = filtered
      .map((m) => {
        // Find last completed step date
        let lastActivity = new Date(m.createdAt);
        for (const sp of m.stageProgress) {
          for (const step of sp.steps) {
            if (step.completedAt) {
              const d = new Date(step.completedAt);
              if (d > lastActivity) lastActivity = d;
            }
          }
        }
        const daysSinceActivity = Math.round((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: m.id,
          name: m.name,
          clientName: m.clientName,
          assignedUserName: m.assignedUserName || "Unassigned",
          totalDays: m.health.daysElapsed,
          daysSinceActivity,
          status: m.health.status,
        };
      })
      .filter((m) => m.daysSinceActivity > 5)
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
      .slice(0, 5);

    // ── Revenue metrics ──
    // SaaS NOTE: These calculations work identically with Prisma once data.ts is converted.
    // All values derive from amountPaid and progressPercent which are already on the Matter model.
    // For deeper profitability (V2): add cost tracking per matter/associate and compute margins.
    const totalActiveValue = filtered.reduce((sum, m) => sum + (m.amountPaid || 0), 0);
    const valueAtRisk = filtered
      .filter((m) => m.health.status === "out_of_flow" || m.health.status === "flow_breakdown")
      .reduce((sum, m) => {
        const remaining = (m.amountPaid || 0) * (1 - m.health.progressPercent / 100);
        return sum + remaining;
      }, 0);
    const closedForRevenue = allMatters.filter((m: any) => m.status === "completed");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const valueDelivered30d = closedForRevenue
      .filter((m: any) => m.completedDate && new Date(m.completedDate) >= thirtyDaysAgo)
      .reduce((sum: number, m: any) => sum + (m.amountPaid || 0), 0);
    const avgMatterValue = filtered.length > 0 ? Math.round(totalActiveValue / filtered.length) : 0;

    // ── Revenue by associate ──
    const revenueByAssociate = users.map((u: any) => {
      const userMatters = filtered.filter((m) => m.assignedUserId === u.id);
      const totalValue = userMatters.reduce((sum, m) => sum + (m.amountPaid || 0), 0);
      const valueDelivered = userMatters.reduce((sum, m) => sum + (m.amountPaid || 0) * (m.health.progressPercent / 100), 0);
      const valueRemaining = totalValue - valueDelivered;
      const atRisk = userMatters
        .filter((m) => m.health.status === "out_of_flow" || m.health.status === "flow_breakdown")
        .reduce((sum, m) => sum + (m.amountPaid || 0) * (1 - m.health.progressPercent / 100), 0);
      return {
        id: u.id, name: u.name, activeCount: userMatters.length,
        totalValue: Math.round(totalValue), valueDelivered: Math.round(valueDelivered),
        valueRemaining: Math.round(valueRemaining), atRisk: Math.round(atRisk),
      };
    }).filter((a) => a.activeCount > 0);

    return NextResponse.json({
      avgDaysToClose,
      flowRate,
      bottleneck: { name: bottleneck.name, avgDaysOver: bottleneck.avg },
      closedThisMonth,
      totalActive: filtered.length,
      totalActiveValue: Math.round(totalActiveValue),
      valueAtRisk: Math.round(valueAtRisk),
      valueDelivered30d: Math.round(valueDelivered30d),
      avgMatterValue,
      stagePerformance: stagePerf,
      associates: assocStats,
      revenueByAssociate,
      agingMatters: aging,
      flows: flows.map((f) => ({ id: f.id, name: f.name })),
    });
  } catch (error) {
    console.error("Command Center API error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
