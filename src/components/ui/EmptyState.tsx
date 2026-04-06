"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-[var(--color-text-muted)]">{icon}</div>}
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[var(--color-text-muted)] max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
