"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiff } from "@/lib/liff-provider";
import { User, CheckCircle, XCircle } from "lucide-react";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isReady, liffError, userId } = useLiff();

  const token = searchParams.get("token");
  const initialAction = searchParams.get("action");

  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("ครู");
  const [ownerPicture, setOwnerPicture] = useState<string | null>(null);
  const [isInvitee, setIsInvitee] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const autoResponded = useRef(false);

  const loadInvite = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ token });
      if (userId) qs.set("line_user_id", userId);
      const res = await fetch(`/api/co-teachers/invite?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ไม่พบคำเชิญ");
        return;
      }
      setOwnerName(data.owner?.display_name || "ครู");
      setOwnerPicture(data.owner?.picture_url ?? null);
      setIsInvitee(data.is_invitee);
      setInviteStatus(data.invite?.status);
      if (data.invite?.status === "accepted") setDone("accepted");
      if (data.invite?.status === "declined") setDone("declined");
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (isReady && token) loadInvite();
  }, [isReady, token, loadInvite]);

  const handleRespond = async (response: "accept" | "decline") => {
    if (!token || !userId) return;
    setResponding(true);
    setError(null);
    try {
      const res = await fetch("/api/co-teachers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          line_user_id: userId,
          token,
          response,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
      setDone(response === "accept" ? "accepted" : "declined");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResponding(false);
    }
  };

  useEffect(() => {
    if (!isReady || loading || !isInvitee || done || responding || autoResponded.current) return;
    if (initialAction !== "accept" && initialAction !== "decline") return;
    if (inviteStatus !== "pending") return;
    autoResponded.current = true;
    handleRespond(initialAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, loading, isInvitee, initialAction, done, inviteStatus]);

  if (liffError) {
    return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  }

  if (!isReady || loading) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF9F0", padding: 16, textAlign: "center" }}>
        <p style={{ color: "#795548" }}>ลิงก์คำเชิญไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFF9F0", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: "0 0 24px", textAlign: "center" }}>
        คำเชิญครูผู้สอนร่วม
      </h1>

      <div style={{
        background: "#fff", borderRadius: 16, padding: 24, textAlign: "center",
        boxShadow: "0 2px 8px rgba(62,39,35,0.06)",
      }}>
        {ownerPicture ? (
          <img src={ownerPicture} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "#FFF8E1",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
          }}>
            <User size={36} color="#F9A825" />
          </div>
        )}

        <div style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", marginBottom: 8 }}>
          {ownerName}
        </div>
        <p style={{ fontSize: 14, color: "#795548", lineHeight: 1.6, margin: "0 0 24px" }}>
          เชิญคุณเป็นครูผู้สอนร่วม<br />ช่วยสร้างการบ้านและประกาศได้
        </p>

        {error && (
          <div style={{ background: "#FFEBEE", color: "#C62828", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {done === "accepted" && (
          <div style={{ color: "#2E7D32" }}>
            <CheckCircle size={48} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>ตอบรับแล้ว</div>
            <p style={{ fontSize: 13, color: "#795548", marginTop: 8 }}>คุณสามารถช่วยสร้างการบ้านและประกาศได้แล้ว</p>
            <button
              onClick={() => router.push("/settings")}
              style={{
                marginTop: 16, padding: "12px 24px", background: "#FFC107", border: "none",
                borderRadius: 50, fontWeight: 700, color: "#3E2723", cursor: "pointer",
              }}
            >
              ไปที่ตั้งค่า
            </button>
          </div>
        )}

        {done === "declined" && (
          <div style={{ color: "#795548" }}>
            <XCircle size={48} color="#A1887F" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>ปฏิเสธคำเชิญแล้ว</div>
          </div>
        )}

        {!done && inviteStatus === "pending" && (
          <>
            {!isInvitee ? (
              <p style={{ fontSize: 13, color: "#A1887F" }}>กรุณาเปิดลิงก์นี้ด้วยบัญชี LINE ที่ได้รับเชิญ</p>
            ) : responding ? (
              <div style={{ color: "#A1887F", fontSize: 14 }}>กำลังดำเนินการ...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => handleRespond("accept")}
                  disabled={responding}
                  style={{
                    padding: 14, background: "#06C755", color: "#fff", border: "none",
                    borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ตกลง
                </button>
                <button
                  onClick={() => handleRespond("decline")}
                  disabled={responding}
                  style={{
                    padding: 14, background: "#F5E6D3", color: "#795548", border: "none",
                    borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ปฏิเสธ
                </button>
              </div>
            )}
          </>
        )}

        {!done && inviteStatus && inviteStatus !== "pending" && (
          <p style={{ fontSize: 13, color: "#A1887F" }}>คำเชิญนี้ตอบแล้ว</p>
        )}
      </div>
    </div>
  );
}

export default function CoTeacherInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>
        Loading...
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
