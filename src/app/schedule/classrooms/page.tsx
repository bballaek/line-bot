"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import { ChevronRight, RefreshCw } from "lucide-react";

type Classroom = {
  id: string;
  name: string;
  line_group_id: string;
  member_count: number;
  group_name: string | null;
  is_active?: boolean;
};

type PendingGroup = { line_group_id: string; group_name: string };

export default function ClassroomsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { canManageClass, loading: userLoading } = useAppUser();
  const [tab, setTab] = useState<"active" | "closed">("active");
  const [active, setActive] = useState<Classroom[]>([]);
  const [closed, setClosed] = useState<Classroom[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingId, setEnablingId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && userId) loadData();
  }, [isReady, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms?line_user_id=${encodeURIComponent(userId!)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.active !== undefined) {
        setActive(data.active || []);
        setClosed(data.closed || []);
        setPendingGroups(data.pending_groups || []);
      } else {
        setActive(data.classrooms || []);
        setClosed([]);
        setPendingGroups([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (group: PendingGroup) => {
    setEnablingId(group.line_group_id);
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: userId,
          line_group_id: group.line_group_id,
          name: group.group_name,
          sync_members: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เปิดการใช้งานไม่สำเร็จ");
      window.location.href = `/schedule/classrooms/${data.classroom.id}`;
    } catch (e: any) {
      alert(e.message || "เปิดการใช้งานไม่สำเร็จ");
    } finally {
      setEnablingId(null);
    }
  };

  const handleReopen = async (classroom: Classroom) => {
    setReopeningId(classroom.id);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: userId, action: "reopen" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เปิดห้องไม่สำเร็จ");
      await loadData();
      setTab("active");
    } catch (e: any) {
      alert(e.message || "เปิดห้องไม่สำเร็จ");
    } finally {
      setReopeningId(null);
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>;
  }

  const list = tab === "active" ? active : closed;

  return (
    <SettingsLayout title="ห้องเรียน" breadcrumb="ห้องเรียนของฉัน" backHref="/schedule">
      {/* Tab switcher */}
      <div style={{ display: "flex", background: "#F5E6D3", borderRadius: 20, padding: 4, marginBottom: 16 }}>
        {([
          { key: "active" as const, label: `ห้องเรียน (${active.length})` },
          { key: "closed" as const, label: `ปิดแล้ว (${closed.length})` },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, textAlign: "center", padding: "8px 0", fontSize: 13,
              fontWeight: tab === t.key ? 600 : 500,
              color: tab === t.key ? "#3E2723" : "#795548",
              background: tab === t.key ? "#FFFFFF" : "transparent",
              border: "none", borderRadius: 16, cursor: "pointer",
              boxShadow: tab === t.key ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#A1887F" }}>กำลังโหลด...</div>
      ) : tab === "active" ? (
        <>
          {/* Pending groups — รอเปิดการใช้งาน */}
          {canManageClass && pendingGroups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", margin: "0 0 10px", paddingLeft: 4 }}>
                กลุ่มที่เชิญบอทแล้ว — กดเปิดการใช้งาน
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingGroups.map((g) => (
                  <div
                    key={g.line_group_id}
                    style={{
                      background: "#fff", border: "1px solid #F5E6D3", borderRadius: 16,
                      padding: "14px 16px", boxShadow: "0 1px 3px rgba(93,64,55,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#3E2723", marginBottom: 10 }}>
                      {g.group_name}
                    </div>
                    <button
                      onClick={() => handleEnable(g)}
                      disabled={enablingId === g.line_group_id}
                      style={{
                        width: "100%", padding: 12, background: "#FFC107", color: "#3E2723",
                        fontSize: 14, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer",
                      }}
                    >
                      {enablingId === g.line_group_id ? "กำลังเปิด..." : "เปิดการใช้งาน"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && pendingGroups.length === 0 ? (
            <SettingsCard>
              <div style={{ padding: "36px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#3E2723", marginBottom: 12 }}>
                  ยังไม่มีห้องเรียน
                </div>
                <p style={{ fontSize: 13, color: "#795548", margin: 0, lineHeight: 1.75 }}>
                  {canManageClass ? (
                    <>
                      สร้างห้องเรียนก่อน โดยเชิญบอท <strong>Song-Yang</strong> เข้าไลน์กลุ่มห้องเรียน
                      หลังจากนั้นกดปุ่ม <strong>เปิดการใช้งาน</strong>
                      คนในกลุ่มจะถือว่าเป็นนักเรียนอัตโนมัติ ✨
                    </>
                  ) : (
                    <>รอครูเชิญบอท Song-Yang เข้ากลุ่ม LINE และเปิดการใช้งานห้องเรียน</>
                  )}
                </p>
              </div>
            </SettingsCard>
          ) : active.length === 0 ? null : (
            <ClassroomList items={active} />
          )}
        </>
      ) : closed.length === 0 ? (
        <SettingsCard>
          <div style={{ padding: "36px 24px", textAlign: "center", color: "#A1887F" }}>
            <div style={{ fontSize: 13 }}>ไม่มีห้องเรียนที่ปิดแล้ว</div>
          </div>
        </SettingsCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {closed.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#fff", border: "1px solid #F5E6D3", borderRadius: 16,
                padding: "16px 18px", opacity: 0.85,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#3E2723" }}>{c.name}</span>
                <span style={{ fontSize: 12, color: "#A1887F" }}>{c.member_count} คน</span>
              </div>
              <button
                onClick={() => handleReopen(c)}
                disabled={reopeningId === c.id}
                style={{
                  width: "100%", padding: 12, background: "#fff", color: "#5D4037",
                  fontSize: 14, fontWeight: 600, border: "1px solid #F5E6D3", borderRadius: 50,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <RefreshCw size={16} />
                {reopeningId === c.id ? "กำลังเปิด..." : "เปิดใช้งานอีกครั้ง"}
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}

function ClassroomList({ items }: { items: Classroom[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => (window.location.href = `/schedule/classrooms/${c.id}`)}
          style={{
            display: "block", width: "100%", textAlign: "left",
            background: "#fff", border: "1px solid #F5E6D3", borderRadius: 16,
            padding: "16px 18px", cursor: "pointer",
            boxShadow: "0 1px 3px rgba(93,64,55,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#3E2723" }}>{c.name}</span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "#5D4037",
              background: "#FFF3E0", padding: "4px 10px", borderRadius: 20,
            }}>
              {c.member_count} คน
            </span>
          </div>
          {c.group_name && c.group_name !== c.name && (
            <div style={{ fontSize: 12, color: "#A1887F", marginBottom: 10 }}>กลุ่ม: {c.group_name}</div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{
              flex: 1, textAlign: "center", padding: "10px 0",
              border: "1px solid #F5E6D3", borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: "#5D4037",
            }}>
              นักเรียน
            </span>
            <span style={{ display: "flex", alignItems: "center", padding: "0 12px", color: "#BCAAA4" }}>
              <ChevronRight size={18} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
