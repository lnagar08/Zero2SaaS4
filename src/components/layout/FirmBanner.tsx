/**
 * FIRM BANNER — Branded header bar (full-bleed)
 *
 * Sits at the very top of the content area, edge to edge.
 * Rounded bottom corners only — top is flush with window edge.
 *
 * SaaS NOTES:
 * - In production, fetch branding from org settings via tenant context.
 * - Logo would be an <img> tag from cloud storage URL.
 * - "Powered by MatterGuardian" links to your marketing site.
 * - Use SWR or React Context to cache — no need to fetch every navigation.
 */
"use client";

import { useEffect, useState, useCallback } from "react";

interface BrandingData {
  firmName: string;
  brandColor: string;
  brandTagline: string;
  brandLogoText: string;
  brandLogoUrl: string;
}

export function FirmBanner() {
  const [branding, setBranding] = useState<BrandingData | null>(null);

  const fetchBranding = useCallback(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then(setBranding)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBranding();
    // Listen for branding updates from Settings page
    const handler = () => fetchBranding();
    window.addEventListener("branding-updated", handler);
    return () => window.removeEventListener("branding-updated", handler);
  }, [fetchBranding]);

  if (!branding) return null;

  const color = branding.brandColor || "#1e3a5f";
  const logoText = branding.brandLogoText || branding.firmName?.charAt(0) || "M";
  const isDark = isBrandColorDark(color);
  const textColor = isDark ? "#ffffff" : "#111318";
  const subtitleColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const mutedColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
  const logoBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
  const logoBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <div
      className="flex items-center gap-4 px-10 py-[16px]"
      style={{
        background: color,
        borderRadius: "0 0 16px 16px",
      }}
    >
      {/* Logo — image (wide, natural aspect) or text fallback (square) */}
      {branding.brandLogoUrl ? (
        <img src={branding.brandLogoUrl}
          className="h-[38px] max-w-[160px] rounded-[8px] object-contain shrink-0"
          style={{ background: logoBg, padding: "4px 8px" }} alt="Logo" />
      ) : (
        <div
          className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: logoBg, border: `1px solid ${logoBorder}` }}
        >
          <span className="text-[15px] font-bold tracking-tight" style={{ color: textColor }}>{logoText}</span>
        </div>
      )}

      {/* Firm name + tagline stacked */}
      <div>
        <p className="text-[17px] font-semibold m-0" style={{ color: textColor }}>{branding.firmName}</p>
        {branding.brandTagline && (
          <p className="text-[12px] m-0 mt-[2px]" style={{ color: subtitleColor }}>
            {branding.brandTagline}
          </p>
        )}
      </div>

      {/* Powered by */}
      <span className="text-[11px] ml-auto" style={{ color: mutedColor }}>
        Powered by MatterGuardian
      </span>
    </div>
  );
}

/**
 * Determines if a hex color is dark (needs white text) or light (needs dark text).
 * Uses WCAG relative luminance formula.
 */
function isBrandColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}
