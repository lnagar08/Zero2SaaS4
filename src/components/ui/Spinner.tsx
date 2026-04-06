"use client";

import { clsx } from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "inline-block w-5 h-5 border-2 border-gray-200 border-t-[var(--color-mf-500)] rounded-full animate-spin",
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-7 h-7" />
    </div>
  );
}
