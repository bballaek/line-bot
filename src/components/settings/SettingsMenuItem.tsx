"use client";

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type Props = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  href: string;
  isLast?: boolean;
};

export default function SettingsMenuItem({ icon, title, subtitle, href, isLast }: Props) {
  return (
    <button
      onClick={() => (window.location.href = href)}
      style={{
        display: "flex", alignItems: "center", gap: 14, width: "100%",
        padding: "16px 18px", background: "#fff", border: "none", cursor: "pointer",
        borderBottom: isLast ? "none" : "1px solid #F5E6D3", textAlign: "left",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: "#FFF8E1",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        color: "#F9A825",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#3E2723" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 13, color: "#A1887F", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        )}
      </div>
      <ChevronRight size={18} color="#BCAAA4" style={{ flexShrink: 0 }} />
    </button>
  );
}
