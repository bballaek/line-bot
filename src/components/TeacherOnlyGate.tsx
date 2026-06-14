"use client";

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import BecomeTeacherCard from "@/components/settings/BecomeTeacherCard";

type Props = {
  children: ReactNode;
  title: string;
  backHref: string;
  featureLabel?: string;
};

export default function TeacherOnlyGate({ children, title, backHref, featureLabel }: Props) {
  const { isReady, liffError, userId } = useLiff();
  const { canManageClass, loading, refresh } = useAppUser();

  if (liffError) {
    return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  }

  if (!isReady || loading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", minHeight: "100vh", background: "#FFF9F0" }}>Loading...</div>;
  }

  if (!canManageClass && userId) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF9F0", padding: "16px 16px 32px" }}>
        <button
          onClick={() => (window.location.href = backHref)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            color: "#5D4037", display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
          }}
        >
          <ArrowLeft size={20} /> กลับ
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: "0 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#795548", marginBottom: 20, lineHeight: 1.6 }}>
          {featureLabel ? `การสร้าง${featureLabel} ` : ""}สำหรับครูและครูผู้สอนร่วมเท่านั้น
        </p>
        <BecomeTeacherCard lineUserId={userId} onSuccess={refresh} />
      </div>
    );
  }

  return <>{children}</>;
}
