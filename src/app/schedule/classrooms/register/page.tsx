"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import liff from "@line/liff";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";

function RegisterContent() {
  const searchParams = useSearchParams();
  const { isReady, liffError, userId } = useLiff();
  const { canManageClass, loading: userLoading } = useAppUser();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingClassroomId, setExistingClassroomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    (async () => {
      let gid = searchParams.get("group_id");

      if (!gid && liff.isInClient()) {
        try {
          const ctx = liff.getContext();
          if (ctx?.type === "group" && ctx.groupId) gid = ctx.groupId;
        } catch {
          /* ignore */
        }
      }

      setGroupId(gid);
      if (!gid) {
        setLoading(false);
        return;
      }

      await loadGroupInfo(gid);
    })();
  }, [isReady, searchParams, userId]);

  const loadGroupInfo = async (gid: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ group_id: gid });
      if (userId) qs.set("line_user_id", userId);
      const res = await fetch(`/api/classrooms/register?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setGroupName(data.group_name);
      setAlreadyRegistered(data.already_registered);
      setExistingClassroomId(data.classroom?.id ?? null);
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!groupId || !userId) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: userId,
          line_group_id: groupId,
          name: groupName,
          sync_members: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลงทะเบียนไม่สำเร็จ");
      window.location.href = `/schedule/classrooms/${data.classroom.id}`;
    } catch (e: any) {
      alert(e.message || "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setRegistering(false);
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading || loading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFF9F0", padding: "16px" }}>
      <h1 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: "0 0 24px" }}>
        ลงทะเบียนห้องเรียน
      </h1>

      {!groupId ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#795548", lineHeight: 1.7 }}>
            ไม่พบข้อมูลกลุ่ม LINE<br />
            กรุณาเปิดลิงก์จากข้อความในกลุ่มแชท
          </div>
        </div>
      ) : notFound ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#795548", lineHeight: 1.7 }}>
            ยังไม่พบกลุ่มนี้ในระบบ<br />
            รอบอทเข้ากลุ่มสักครู่แล้วลองใหม่
          </div>
        </div>
      ) : alreadyRegistered && existingClassroomId ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3E2723", marginBottom: 8 }}>
            ห้องเรียนนี้ลงทะเบียนแล้ว
          </div>
          <div style={{ fontSize: 13, color: "#795548", marginBottom: 20 }}>{groupName}</div>
          <button
            onClick={() => (window.location.href = `/schedule/classrooms/${existingClassroomId}`)}
            style={{
              width: "100%", padding: 14, background: "#FFC107", color: "#3E2723",
              fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer",
            }}
          >
            ไปที่ห้องเรียน
          </button>
        </div>
      ) : !canManageClass ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#E53935", fontWeight: 600, marginBottom: 8 }}>เฉพาะคุณครูเท่านั้น</div>
          <div style={{ fontSize: 13, color: "#795548", lineHeight: 1.7 }}>
            หน้านี้สำหรับครูที่จะลงทะเบียนห้องเรียน<br />
            นักเรียนไม่ต้องลงทะเบียน — รอครูเปิดห้องแล้วกรอกข้อมูลตัวเองได้
          </div>
        </div>
      ) : (
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3",
          padding: "28px 24px", boxShadow: "0 1px 3px rgba(93,64,55,0.08)",
        }}>
          <div style={{ fontSize: 13, color: "#A1887F", marginBottom: 6 }}>ห้องเรียน</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#3E2723", marginBottom: 28 }}>
            {groupName || "กลุ่ม LINE"}
          </div>
          <button
            onClick={handleRegister}
            disabled={registering}
            style={{
              width: "100%", padding: 16, background: registering ? "#BCAAA4" : "#FFC107",
              color: "#3E2723", fontSize: 16, fontWeight: 700,
              border: "none", borderRadius: 50, cursor: registering ? "not-allowed" : "pointer",
            }}
          >
            {registering ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
          </button>
          <p style={{ fontSize: 12, color: "#A1887F", textAlign: "center", margin: "16px 0 0", lineHeight: 1.6 }}>
            คนในกลุ่มจะถูกดึงเป็นนักเรียนอัตโนมัติ ✨
          </p>
        </div>
      )}
    </div>
  );
}

export default function RegisterClassroomPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
