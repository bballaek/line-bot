"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/lib/supabase";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import { Info, AlertTriangle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Google ไม่ส่ง authorization code กลับมา ลองใหม่อีกครั้ง",
  not_configured: "ระบบยังไม่ได้ตั้งค่า Google OAuth (ติดต่อผู้ดูแลระบบ)",
  token_failed: "แลก token ไม่สำเร็จ ตรวจสอบ Redirect URI ใน Google Cloud Console",
  callback_failed: "เกิดข้อผิดพลาดระหว่างเชื่อมต่อ ลองใหม่อีกครั้ง",
  unauthorized: "บัญชีนี้ไม่มีสิทธิ์เชื่อมต่อ Google Drive",
};

export default function GoogleDriveSettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user, loading: userLoading, canManageIntegrations } = useAppUser();
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (isReady && userId && user?.id && canManageIntegrations) loadIntegration();

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      loadIntegration();
      window.history.replaceState({}, "", "/settings/google-drive");
    }
    const err = params.get("error");
    if (err) {
      alert(ERROR_MESSAGES[err] || "เชื่อมต่อ Google Drive ไม่สำเร็จ");
      window.history.replaceState({}, "", "/settings/google-drive");
    }
  }, [isReady, userId, user?.id, canManageIntegrations]);

  useEffect(() => {
    if (!userLoading && !canManageIntegrations) {
      window.location.href = "/settings";
    }
  }, [userLoading, canManageIntegrations]);

  const loadIntegration = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("teacher_integrations")
      .select("google_email, connected_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.google_email) {
      setConnected(true);
      setGoogleEmail(data.google_email);
    }
  };

  const handleConnect = async () => {
    if (!userId) return;
    setConnecting(true);
    try {
      const authUrl = `${window.location.origin}/api/auth/google?line_user_id=${encodeURIComponent(userId)}`;
      // Google OAuth ใน LINE in-app browser มักถูก block — เปิด browser ภายนอก
      if (liff.isInClient()) {
        liff.openWindow({ url: authUrl, external: true });
        setConnecting(false);
      } else {
        window.location.href = authUrl;
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อ Google Drive ได้");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id || !confirm("ต้องการยกเลิกการเชื่อมต่อ Google Drive ใช่หรือไม่?")) return;
    await supabase.from("teacher_integrations").delete().eq("user_id", user.id);
    setConnected(false);
    setGoogleEmail(null);
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;
  }

  return (
    <SettingsLayout title="Google Drive" breadcrumb="Google Drive">
      <SettingsCard>
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#E3F2FD",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M7.71 3.5L1.15 15a1 1 0 000 1l3.57 6.17A1 1 0 005.57 23h12.86a1 1 0 00.85-1.5L12 3.5a1 1 0 00-1.72 0z" fill="#FFC107"/>
              <path d="M12 3.5L18.56 15H12V3.5z" fill="#4CAF50"/>
              <path d="M12 15l6.56 0L15.43 21.17A1 1 0 0014.57 22H12V15z" fill="#2196F3"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: "0 0 12px" }}>
            {connected ? "เชื่อมต่อแล้ว" : "เชื่อมต่อ Google Drive"}
          </h2>

          {connected && googleEmail ? (
            <p style={{ fontSize: 14, color: "#795548", lineHeight: 1.7, margin: "0 0 20px" }}>
              บัญชี: <strong>{googleEmail}</strong>
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "#795548", lineHeight: 1.7, margin: "0 0 20px" }}>
              เชื่อมต่อ Google Drive เพื่อสำรองไฟล์งานของนักเรียนโดยอัตโนมัติ<br />
              ไฟล์จะถูกจัดเก็บตามห้องเรียนและชื่องาน
            </p>
          )}

          <button
            style={{
              background: "none", border: "none", color: "#1976D2", fontSize: 13,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              marginBottom: 24,
            }}
          >
            <Info size={14} /> โครงสร้างโฟลเดอร์ใน Google Drive
          </button>

          {connected ? (
            <button
              onClick={handleDisconnect}
              style={{
                width: "100%", padding: 14, background: "#fff", color: "#E53935",
                border: "1px solid #FFCDD2", borderRadius: 50, fontSize: 15, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ยกเลิกการเชื่อมต่อ
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                width: "100%", padding: 14, background: connecting ? "#FFE082" : "#FFC107",
                color: "#3E2723", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700,
                cursor: connecting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#3E2723" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#3E2723" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#3E2723" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#3E2723" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {connecting ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อด้วย Google"}
            </button>
          )}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            marginTop: 16, fontSize: 12, color: "#FF8F00",
          }}>
            <AlertTriangle size={14} />
            เฉพาะงานที่คุณเป็นเจ้าของเท่านั้น
          </div>
        </div>
      </SettingsCard>
    </SettingsLayout>
  );
}
