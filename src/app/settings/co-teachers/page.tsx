"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import { Plus, Trash2, User } from "lucide-react";

type CoTeacher = {
  id: string;
  teacher_id: string;
  display_name: string | null;
  picture_url: string | null;
};

export default function CoTeachersSettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user, loading: userLoading, canManageIntegrations } = useAppUser();
  const [coTeachers, setCoTeachers] = useState<CoTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; picture_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!userLoading && !canManageIntegrations) {
      window.location.href = "/settings";
    }
  }, [userLoading, canManageIntegrations]);

  useEffect(() => {
    if (isReady && userId && user?.id && canManageIntegrations) loadCoTeachers();
  }, [isReady, userId, user?.id, canManageIntegrations]);

  const loadCoTeachers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/co-teachers?line_user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setCoTeachers(data.coTeachers || []);
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

  const handleAdd = async (teacherId: string) => {
    if (!userId) return;
    try {
      const res = await fetch("/api/co-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: userId, teacher_id: teacherId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "เพิ่มไม่สำเร็จ");
      }
      setShowAdd(false);
      setSearchQuery("");
      setSearchResults([]);
      loadCoTeachers();
    } catch (err: any) {
      alert(err.message);
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

  return (
    <SettingsLayout title="ครูผู้สอนร่วม" breadcrumb="ครูผู้สอนร่วม">
      <p style={{ fontSize: 14, color: "#795548", marginBottom: 16, lineHeight: 1.6 }}>
        เพิ่มครูที่สามารถสร้างการบ้านและประกาศได้ร่วมกับคุณ
      </p>

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
        <Plus size={18} /> เพิ่มครูผู้สอนร่วม
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
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", marginBottom: 16 }}>เพิ่มครูผู้สอนร่วม</h3>
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
                  onClick={() => handleAdd(u.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "12px 8px", background: "none", border: "none",
                    borderBottom: "1px solid #F5E6D3", cursor: "pointer", textAlign: "left",
                  }}
                >
                  {u.picture_url ? (
                    <img src={u.picture_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={18} color="#F9A825" />
                    </div>
                  )}
                  <span style={{ fontSize: 14, color: "#3E2723" }}>{u.display_name || "ไม่ระบุชื่อ"}</span>
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
