"use client";

import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, GraduationCap, Megaphone, Settings, LucideIcon } from "lucide-react";

export const BOTTOM_NAV_HEIGHT = 64;

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/homework-list",
    label: "การบ้าน",
    icon: ClipboardList,
    match: (p) => p === "/homework-list" || p.startsWith("/homework-list/"),
  },
  {
    href: "/schedule",
    label: "ห้องเรียน",
    icon: GraduationCap,
    match: (p) => p === "/schedule" || p.startsWith("/schedule/"),
  },
  {
    href: "/announcements",
    label: "ประกาศ",
    icon: Megaphone,
    match: (p) => p === "/announcements" || p.startsWith("/announcements/"),
  },
  {
    href: "/settings",
    label: "ตั้งค่า",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

export function bottomNavOffset(extra = 0) {
  return `calc(${BOTTOM_NAV_HEIGHT + extra}px + env(safe-area-inset-bottom, 0px))`;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_NAV_HEIGHT,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "#fff",
        borderTop: "1px solid #E8E0D4",
        display: "flex",
        zIndex: 110,
        boxShadow: "0 -2px 8px rgba(93,64,55,0.06)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        const color = active ? "#F9A825" : "#BCAAA4";

        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0",
            }}
          >
            <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
            <span style={{
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              color: active ? "#5D4037" : "#A1887F",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
