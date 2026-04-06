"use client";

import { FlowHealthStatus, FLOW_STATUS_LABELS } from "@/types";
import { clsx } from "clsx";

const BADGE_STYLES: Record<FlowHealthStatus, { bg: string; text: string; dot: string }> = {
  in_flow: { bg: "bg-[#ECFDF5]", text: "text-[#059669]", dot: "bg-[#22C55E]" },
  at_flow_risk: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", dot: "bg-[#F59E0B]" },
  out_of_flow: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]", dot: "bg-[#EF4444]" },
  flow_breakdown: { bg: "bg-[#F3E8FF]", text: "text-[#7C3AED]", dot: "bg-[#8B5CF6]" },
};

interface StatusBadgeProps {
  status: FlowHealthStatus;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function StatusBadge({ status, size = "sm", showDot = true }: StatusBadgeProps) {
  const s = BADGE_STYLES[status];
  const label = FLOW_STATUS_LABELS[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium",
        s.bg, s.text,
        size === "sm" ? "px-2 py-[2px] text-[10px] rounded-[4px]" : "px-2.5 py-[3px] text-[11px] rounded-[5px]"
      )}
    >
      {showDot && <span className={clsx("rounded-full", s.dot, size === "sm" ? "w-1.5 h-1.5" : "w-[5px] h-[5px]")} />}
      {label}
    </span>
  );
}
