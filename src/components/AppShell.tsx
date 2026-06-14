"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { t } from "@/lib/app-theme";
import { bottomNavOffset } from "@/components/BottomNav";

export function AppPage({ children, footerExtra = 0 }: { children: ReactNode; footerExtra?: number }) {
  return (
    <div style={{ minHeight: "100vh", background: t.bg, paddingBottom: bottomNavOffset(footerExtra) }}>
      {children}
    </div>
  );
}

export function AppHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ padding: "18px 20px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Icon && <Icon size={22} color={t.accentIcon} />}
          <span style={{ color: t.text, fontWeight: 700, fontSize: 18 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {subtitle && <span style={{ color: t.textMuted, fontSize: 13 }}>{subtitle}</span>}
          {action}
        </div>
      </div>
    </div>
  );
}

export function AppSubHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "0 16px 12px", fontSize: 15, fontWeight: 600, color: t.textSecondary }}>
      {children}
    </div>
  );
}

export function AppCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: t.card, borderRadius: 14, border: `1px solid ${t.border}`,
      boxShadow: t.shadow, overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

export function AppStickyHeader({ title, backHref, children }: { title: string; backHref: string; children?: ReactNode }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center",
      padding: "14px 16px", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${t.border}`,
    }}>
      <button onClick={() => (window.location.href = backHref)} style={{
        background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
        color: t.textSecondary, display: "flex", alignItems: "center",
      }}>
        ←
      </button>
      <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: t.text, margin: 0, paddingRight: 36 }}>
        {title}
      </h1>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, style }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      width: "100%", maxWidth: 400, margin: "0 auto", padding: 14,
      background: disabled ? t.btnDisabled : t.btnPrimary,
      color: t.btnPrimaryText, fontSize: 15, fontWeight: 700,
      border: "none", borderRadius: 50, cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}>
      {children}
    </button>
  );
}

export function FixedFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px",
      paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      background: t.footerBg, backdropFilter: "blur(10px)",
      borderTop: `1px solid ${t.border}`, zIndex: 100,
    }}>
      {children}
    </div>
  );
}
