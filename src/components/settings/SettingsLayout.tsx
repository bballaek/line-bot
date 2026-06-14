"use client";

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { bottomNavOffset } from "@/components/BottomNav";

type Props = {
  title: string;
  backHref?: string;
  breadcrumb?: string;
  hideBack?: boolean;
  children: ReactNode;
};

export default function SettingsLayout({ title, backHref = "/settings", breadcrumb, hideBack, children }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFF9F0", display: "flex", flexDirection: "column", paddingBottom: hideBack ? bottomNavOffset() : 0 }}>
      <div style={{ padding: "14px 16px 8px" }}>
        {hideBack ? (
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: 0, textAlign: "center" }}>{title}</h1>
        ) : (
        <button
          onClick={() => (window.location.href = backHref)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            color: "#8B6914", display: "flex", alignItems: "center", gap: 6,
            fontSize: 14, fontWeight: 500,
          }}
        >
          <ArrowLeft size={18} />
          {breadcrumb ? (
            <span>
              <span style={{ color: "#A1887F" }}>กลับ</span>
              <span style={{ color: "#BCAAA4", margin: "0 6px" }}>/</span>
              <span style={{ color: "#5D4037" }}>{breadcrumb}</span>
            </span>
          ) : (
            <span style={{ color: "#5D4037" }}>{title}</span>
          )}
        </button>
        )}
      </div>

      <div style={{ padding: "8px 16px 32px", flex: 1 }}>{children}</div>
    </div>
  );
}

export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 1px 3px rgba(93,64,55,0.08)", border: "1px solid #F5E6D3",
    }}>
      {children}
    </div>
  );
}

export function SettingsSaveBar({ onSave, saving, saved, label = "บันทึก" }: {
  onSave: () => void; saving: boolean; saved: boolean; label?: string;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px",
      paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)",
      borderTop: "1px solid #F5E6D3", zIndex: 100,
    }}>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", maxWidth: 400, margin: "0 auto", padding: 14,
          background: saving ? "#BCAAA4" : saved ? "#66BB6A" : "#FFC107",
          color: "#3E2723", fontSize: 15, fontWeight: 700,
          border: "none", borderRadius: 50, cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว!" : label}
      </button>
    </div>
  );
}
