"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Workflow, BarChart3, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

// SaaS NOTE: In production, filter NAV_ITEMS by user role.
// Command Center should only show for users with role === "OWNER".
// Associates see: Overview, Templates, Settings only.
// Example: const items = userRole === "OWNER" ? NAV_ITEMS : NAV_ITEMS.filter(i => !i.ownerOnly);
const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/command-center", label: "Command Center", icon: BarChart3, ownerOnly: true },
  { href: "/matterflows", label: "Workflows", icon: Workflow, ownerOnly: false },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: false },
  { href: "/portal", label: "Client Portal", icon: ExternalLink, ownerOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-30"
      style={{ background: "#1E2028" }}>
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>
            <svg width="20" height="20" viewBox="0 0 42 42" fill="none">
              <path d="M8 10 L28 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M12 21 L32 21" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M8 32 L28 32" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M29 6 L35 10 L29 14" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M33 17 L37 21 L33 25" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#F0F0F2]">MatterGuardian</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 pt-2">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[1px]"
          style={{ color: "rgba(255,255,255,0.35)" }}>Workspace</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={clsx("flex items-center gap-[10px] px-3 py-[10px] rounded-lg text-[14px] font-medium no-underline mb-[3px] transition-all duration-150",
                !isActive && "hover:bg-[rgba(255,255,255,0.06)]")}
              style={isActive ? { background: "rgba(99,102,241,0.15)", color: "#D4D8FF" } : { color: "rgba(255,255,255,0.55)" }}>
              <item.icon className="w-[17px] h-[17px]" strokeWidth={2}
                style={{ color: isActive ? "#A5B4FC" : "rgba(255,255,255,0.45)" }} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4">
        <div className="p-3 rounded-[10px]"
          style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-[9px]">
            <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[12px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>EW</div>
            <div>
              <p className="text-[13px] font-medium m-0" style={{ color: "rgba(255,255,255,0.85)" }}>Erik Weingold</p>
              <p className="text-[11px] m-0" style={{ color: "rgba(255,255,255,0.4)" }}>PPM Lawyers</p>
            </div>
          </div>
        </div>
        <p className="text-center mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>v4.2.0</p>
      </div>
    </aside>
  );
}
