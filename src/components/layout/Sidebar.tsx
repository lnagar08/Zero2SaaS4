"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Workflow, BarChart3, ExternalLink, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react"

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
  const { data: session, status } = useSession();
  const userRole = session?.user?.role;
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly) {
      return userRole === "OWNER";
    }
    return true;
  });
  const userName = session?.user?.name || "User";

  function getInitials(name: string) {
    if (!name) return "";

    const parts = name.trim().split(/\s+/);
    
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    } else {
      const firstInitial = parts[0][0];
      const lastInitial = parts[parts.length - 1][0];
      return (firstInitial + lastInitial).toUpperCase();
    }
  }
  const userInitials = getInitials(userName);
  const userRRole = session?.user?.role || "USER";

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
        {filteredNavItems.map((item) => {
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
      <div className="px-3 py-4 space-y-3">
        <div className="p-3 rounded-[10px]"
          style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-[9px]">
            <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[12px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}>{userInitials}</div>
            <div>
              <p className="text-[13px] font-medium m-0" style={{ color: "rgba(255,255,255,0.85)" }}>{userName}</p>
              <p className="text-[11px] m-0" style={{ color: "rgba(255,255,255,0.4)" }}>{userRRole}</p>
            </div>
          </div>
        </div>
        {/* Logout Button */}
      <button 
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full flex items-center justify-left gap-2.5 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 group"
        style={{ 
          background: "rgba(255, 68, 68, 0.08)", 
          border: "0.5px solid rgba(255, 68, 68, 0.2)",
          color: "#FF4D4D"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 68, 68, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 68, 68, 0.08)";
        }}
      >
        <LogOut size={16} strokeWidth={2.25} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Logout</span>
      </button>
        <p className="text-center mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>v4.4.0</p>
      </div>
    </aside>
  );
}
