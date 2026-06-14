"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import BecomeTeacherCard from "@/components/settings/BecomeTeacherCard";
import { Plus, Trash2, User, Clock, Send, Copy, Check } from "lucide-react";

type CoTeacher = {
  id: string;
  teacher_id: string;
  display_name: string | null;
  picture_url: string | null;
};

type PendingInvite = {
  id: string;
  token: string;
  invitee_id: string;
  display_name: string | null;
  picture_url: string | null;
  created_at: string;
};

export default function CoTeachersSettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user, loading: userLoading, canManageIntegrations } = useAppUser();
  const [coTeachers, setCoTeachers] = useState<CoTeacher[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; picture_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !canManageIntegrations) return;
    if (isReady && userId && user?.id && canManageIntegrations) loadCoTeachers();
  }, [isReady, userId, user?.id, canManageIntegrations, userLoading]);

  const loadCoTeachers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/co-teachers?line_user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setCoTeachers(data.coTeachers || []);
      setPendingInvites(data.pendingInvites || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/co-teachers/search?q=${encodeURIComponent(searchQuery)}&line_user_id=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (teacherId: string) => {
    if (!userId) return;
    setInviting(teacherId);
    try {
      const res = await fetch("/api/co-teachers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: userId, teacher_id: teacherId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ส่งคำเชิญไม่สำเร็จ");
      }

      if (data.line_sent) {
        alert(`ส่งคำเชิญไปยัง ${data.invitee_name || "ครู"} ทาง LINE แล้ว รอการตอบรับ`);
      } else {
        const msg = `ส่งข้อความ LINE ไม่ได้ (อาจยังไม่ได้เพิ่มบอทเป็นเพื่อน)\n\nคัดลอกลิงก์นี้ส่งให้ครู:\n${data.invite_url}`;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(data.invite_url);
          alert(msg + "\n\n(คัดลอกลิงก์แล้ว)");
        } else {
          alert(msg);
        }
      }

      setShowAdd(false);
      setSearchQuery("");
      setSearchResults([]);
      loadCoTeachers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviting(null);
    }
  };

  const handleCancelInvite = async (token: string) => {
    if (!userId || !confirm("ยกเลิกคำเชิญนี้ใช่หรือไม่?")) return;
    try {
      await fetch("/api/co-teachers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", line_user_id: userId, token }),
      });
      loadCoTeachers();
    } catch {
      alert("ยกเลิกไม่สำเร็จ");
    }
  };

  const handleCopyLink = async (token: string) => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const url = `https://liff.line.me/${liffId}/settings/co-teachers/invite?token=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      alert(url);
    }
  };

  const handleRemove = async (id: string) => {
    if (!userId || !confirm("ต้องการลบครูผู้สอนร่วมคนนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/co-teachers?id=${id}&line_user_id=${encodeURIComponent(userId)}`, { method: "DELETE" });
      loadCoTeachers();
    } catch {
      alert("ลบไม่สำเร็จ");
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;
  }

  if (!canManageIntegrations && userId) {
    return (
      <SettingsLayout title="ครูผู้สอนร่วม" breadcrumb="ครูผู้สอนร่วม">
        <p style={{ fontSize: 14, color: "#795548", marginBottom: 16, lineHeight: 1.6 }}>
          เพิ่มครูที่ช่วยสร้างการบ้านและประกาศได้ — ต้องลงทะเบียนเป็นครูก่อน
        </p>
        <BecomeTeacherCard lineUserId={userId} onSuccess={() => window.location.reload()} />
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="ครูผู้สอนร่วม" breadcrumb="ครูผู้สอนร่วม">
      <p style={{ fontSize: 14, color: "#795548", marginBottom: 16, lineHeight: 1.6 }}>
        เชิญครูผ่าน LINE — อีกฝ่ายกดตกลงจึงจะได้สิทธิ์สร้างการบ้านและประกาศร่วมกัน
      </p>

      {pendingInvites.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#A1887F", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} /> รอตอบรับ ({pendingInvites.length})
          </div>
          <SettingsCard>
            {pendingInvites.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                  borderBottom: i < pendingInvites.length - 1 ? "1px solid #F5E6D3" : "none",
                }}
              >
                {inv.picture_url ? (
                  <img src={inv.picture_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "#FFF8E1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <User size={20} color="#F9A825" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#3E2723" }}>
                    {inv.display_name || "ไม่ระบุชื่อ"}
                  </div>
                  <div style={{ fontSize: 12, color: "#A1887F" }}>รอการตอบรับ</div>
                </div>
                <button
                  onClick={() => handleCopyLink(inv.token)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  title="คัดลอกลิงก์เชิญ"
                >
                  {copiedToken === inv.token ? <Check size={16} color="#2E7D32" /> : <Copy size={16} color="#A1887F" />}
                </button>
                <button
                  onClick={() => handleCancelInvite(inv.token)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <Trash2 size={16} color="#E53935" />
                </button>
              </div>
            ))}
          </SettingsCard>
        </>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: "#A1887F", margin: "16px 0 8px" }}>
        ครูผู้สอนร่วม ({coTeachers.length})
      </div>
      <SettingsCard>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#A1887F" }}>กำลังโหลด...</div>
        ) : coTeachers.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#A1887F" }}>
            <User size={32} color="#FFE082" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14 }}>ยังไม่มีครูผู้สอนร่วม</div>
          </div>
        ) : (
          coTeachers.map((ct, i) => (
            <div
              key={ct.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                borderBottom: i < coTeachers.length - 1 ? "1px solid #F5E6D3" : "none",
              }}
            >
              {ct.picture_url ? (
                <img src={ct.picture_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: "#FFF8E1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <User size={20} color="#F9A825" />
                </div>
              )}
              <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#3E2723" }}>
                {ct.display_name || "ไม่ระบุชื่อ"}
              </div>
              <button
                onClick={() => handleRemove(ct.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <Trash2 size={16} color="#E53935" />
              </button>
            </div>
          ))
        )}
      </SettingsCard>

      <button
        onClick={() => setShowAdd(true)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", marginTop: 16, padding: 14, background: "#FFC107",
          color: "#3E2723", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Plus size={18} /> เชิญครูผู้สอนร่วม
      </button>

      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setShowAdd(false)}>
          <div
            style={{
              background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480,
              padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", marginBottom: 8 }}>เชิญครูผู้สอนร่วม</h3>
            <p style={{ fontSize: 13, color: "#795548", marginBottom: 16 }}>
              ค้นหาชื่อแล้วส่งคำเชิญทาง LINE — ครูจะได้รับข้อความให้กดตกลง
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="ค้นหาชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{
                  flex: 1, padding: "12px 14px", border: "1px solid #F5E6D3",
                  borderRadius: 10, fontSize: 15, outline: "none",
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  padding: "12px 16px", background: "#FFC107", border: "none",
                  borderRadius: 10, fontWeight: 600, cursor: "pointer", color: "#3E2723",
                }}
              >
                {searching ? "..." : "ค้นหา"}
              </button>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleInvite(u.id)}
                  disabled={inviting === u.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "12px 8px", background: "none", border: "none",
                    borderBottom: "1px solid #F5E6D3", cursor: inviting === u.id ? "wait" : "pointer", textAlign: "left",
                    opacity: inviting === u.id ? 0.6 : 1,
                  }}
                >
                  {u.picture_url ? (
                    <img src={u.picture_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={18} color="#F9A825" />
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: 14, color: "#3E2723" }}>{u.display_name || "ไม่ระบุชื่อ"}</span>
                  <Send size={16} color="#06C755" />
                </button>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && (
                <div style={{ textAlign: "center", padding: 20, color: "#A1887F", fontSize: 13 }}>
                  ไม่พบผู้ใช้ ลองค้นหาชื่อที่ใช้ใน LINE
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
