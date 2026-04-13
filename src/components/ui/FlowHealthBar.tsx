"use client";

import { FlowHealthResult } from "@/types";
import { clsx } from "clsx";

interface FlowHealthBarProps {
  health: FlowHealthResult;
  showLabel?: boolean;
  height?: "sm" | "md";
}

const STATUS_GRADIENT: Record<string, string> = {
  in_flow: "from-emerald-400 to-emerald-500",
  at_flow_risk: "from-amber-400 to-amber-500",
  out_of_flow: "from-red-400 to-red-500",
  flow_breakdown: "from-violet-400 to-violet-500",
};

export function FlowHealthBar({ health, showLabel = false, height = "sm" }: FlowHealthBarProps) {
  const totalStages = health.totalStages || 1;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] text-[var(--color-text-muted)] font-medium">
            {health.currentStageName || "—"}
          </span>
          <span className="text-[11.5px] text-[var(--color-text-muted)] font-medium">
            {health.progressPercent}%
          </span>
        </div>
      )}

      {/* Stage segments */}
      <div className={clsx("flex gap-1 w-full", height === "sm" ? "h-1.5" : "h-2.5")}>
        {Array.from({ length: totalStages }).map((_, i) => {
          const isCurrent = i === health.currentStageIndex;
          const isCompleted = i < (health.currentStageIndex ?? 0);
          const isFuture = i > (health.currentStageIndex ?? 0);

          return (
            <div
              key={i}
              className={clsx(
                "flex-1 rounded-full overflow-hidden transition-all duration-300",
                isFuture ? "bg-gray-100" : "bg-gray-100"
              )}
            >
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                  isCompleted && "w-full from-emerald-400 to-emerald-500",
                  isCurrent && STATUS_GRADIENT[health.status],
                  isFuture && "w-0"
                )}
                style={
                    isCurrent
                      ? {
                          width: `${Math.max(
                            10,
                            health.totalSteps > 0
                              ? (health.completedSteps / health.totalSteps) * 100
                              : 0
                          )}%`,
                        }
                      : undefined
                  }

              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
