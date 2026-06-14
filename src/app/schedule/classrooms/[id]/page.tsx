"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiff } from "@/lib/liff-provider";
import StudentProfileForm from "@/components/classroom/StudentProfileForm";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import { X, Edit3, Trash2, RefreshCw, UserCircle } from "lucide-react";

type Member = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  student_number: number | null;
  full_name: string | null;
  nickname: string | null;
  profile_complete: boolean;
};

type Classroom = {
  id: string;
  name: string;
  line_group_id: string;
  group_name: string | null;
};

function displayLabel(m: Member) {
  if (m.full_name && m.nickname) return `${m.full_name} (${m.nickname})`;
  if (m.full_name) return m.full_name;
  return m.display_name || "ไม่ทราบชื่อ";
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { isReady, liffError, userId } = useLiff();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isReady && userId && classroomId) loadData();
  }, [isReady, userId, classroomId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}?line_user_id=${encodeURIComponent(userId!)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "โหลดไม่สำเร็จ");
      }
      const data = await res.json();
      setClassroom(data.classroom);
      setMembers(data.members || []);
      setCanManage(data.can_manage);
      setMyMemberId(data.my_member_id);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: userId, action: "sync" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ดึงสมาชิกไม่สำเร็จ");
      alert(`ดึงสมาชิกแล้ว ${data.sync?.synced ?? 0} คน`);
      await loadData();
    } catch (e: any) {
      alert(e.message || "ดึงสมาชิกไม่สำเร็จ");
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("ปิดห้องเรียนนี้? จะย้ายไปแท็บ「ปิดแล้ว」")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}?line_user_id=${encodeURIComponent(userId!)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ปิดห้องไม่สำเร็จ");
      }
      window.location.href = "/schedule/classrooms";
    } catch (e: any) {
      alert(e.message || "ปิดห้องไม่สำเร็จ");
    } finally {
      setClosing(false);
    }
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setStudentNumber(m.student_number != null ? String(m.student_number) : "");
    setFullName(m.full_name || "");
    setNickname(m.nickname || "");
  };

  const openMyProfile = () => {
    const me = members.find((m) => m.id === myMemberId);
    if (me) openEdit(me);
  };

  const handleSave = async () => {
    if (!editing || !userId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/members/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: userId,
          student_number: studentNumber,
          full_name: fullName,
          nickname,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setEditing(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("ลบนักเรียนออกจากรายชื่อห้องเรียน?")) return;
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/members/${memberId}?line_user_id=${encodeURIComponent(userId!)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ลบไม่สำเร็จ");
      }
      await loadData();
    } catch (e: any) {
      alert(e.message || "ลบไม่สำเร็จ");
    }
  };

  const canEditMember = (m: Member) => canManage || m.id === myMemberId;

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || loading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>;
  }

  if (!classroom) {
    return (
      <SettingsLayout title="ห้องเรียน" breadcrumb="ไม่พบห้อง" backHref="/schedule/classrooms">
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#A1887F" }}>ไม่พบห้องเรียน</div>
      </SettingsLayout>
    );
  }

  const completeCount = members.filter((m) => m.profile_complete).length;
  const myMember = members.find((m) => m.id === myMemberId);

  return (
    <>
      <SettingsLayout title="ห้องเรียน" breadcrumb={classroom.name} backHref="/schedule/classrooms">
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: "0 0 4px" }}>{classroom.name}</h2>
          <p style={{ fontSize: 13, color: "#A1887F", margin: 0 }}>
            นักเรียน {members.length} คน
            {members.length > 0 && ` · กรอกข้อมูลแล้ว ${completeCount} คน`}
          </p>
          {classroom.group_name && (
            <p style={{ fontSize: 12, color: "#BCAAA4", margin: "4px 0 0" }}>กลุ่ม LINE: {classroom.group_name}</p>
          )}
        </div>

        {canManage && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: 14, background: "#FFC107", color: "#3E2723",
                fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50,
                cursor: syncing ? "not-allowed" : "pointer", marginBottom: 10,
              }}
            >
              <RefreshCw size={18} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
              {syncing ? "กำลังดึงสมาชิก..." : "ดึงสมาชิกจากกลุ่ม LINE"}
            </button>
            <button
              onClick={handleClose}
              disabled={closing}
              style={{
                width: "100%", padding: 12, background: "#fff", color: "#A1887F",
                fontSize: 13, fontWeight: 600, border: "1px solid #F5E6D3", borderRadius: 50,
                cursor: closing ? "not-allowed" : "pointer", marginBottom: 16,
              }}
            >
              {closing ? "กำลังปิด..." : "ปิดห้องเรียน"}
            </button>
          </>
        )}

        {!canManage && myMemberId && (
          <button
            onClick={openMyProfile}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: 14, background: myMember?.profile_complete ? "#fff" : "#FFC107",
              color: "#3E2723", fontSize: 15, fontWeight: 700,
              border: myMember?.profile_complete ? "1px solid #F5E6D3" : "none",
              borderRadius: 50, cursor: "pointer", marginBottom: 16,
            }}
          >
            <Edit3 size={18} />
            {myMember?.profile_complete ? "แก้ไขข้อมูลของฉัน" : "แนะนำตัว / กรอกข้อมูล"}
          </button>
        )}

        {members.length === 0 ? (
          <SettingsCard>
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#A1887F" }}>
              <UserCircle size={40} color="#FFE082" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600, color: "#795548" }}>ยังไม่มีนักเรียน</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {canManage ? "กดปุ่มด้านบนเพื่อดึงสมาชิกจากกลุ่ม LINE" : "รอครูดึงสมาชิกจากกลุ่ม"}
              </div>
            </div>
          </SettingsCard>
        ) : (
          <SettingsCard>
            {members.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  borderBottom: i === members.length - 1 ? "none" : "1px solid #F5E6D3",
                }}
              >
                {m.picture_url ? (
                  <img src={m.picture_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "#FFF8E1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, color: "#F9A825", flexShrink: 0,
                  }}>
                    {(m.display_name || "?")[0]}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#3E2723", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {displayLabel(m)}
                    </span>
                    {m.id === myMemberId && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#F9A825", background: "#FFF8E1", padding: "2px 6px", borderRadius: 4 }}>ฉัน</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#A1887F" }}>
                    {m.student_number != null ? `เลขที่ ${m.student_number}` : "ยังไม่มีเลขที่"}
                    {!m.profile_complete && <span style={{ color: "#D97706", marginLeft: 8 }}>· ยังไม่ครบ</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#BCAAA4", marginTop: 2 }}>LINE: {m.display_name || "-"}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {canEditMember(m) && (
                    <button onClick={() => openEdit(m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#BCAAA4" }}>
                      <Edit3 size={16} />
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#BCAAA4" }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </SettingsCard>
        )}
      </SettingsLayout>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setEditing(null)}>
          <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 24px calc(24px + env(safe-area-inset-bottom))", maxWidth: 480, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#A1887F" }}>
              <X size={22} />
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: "0 0 4px" }}>แก้ไขข้อมูลนักเรียน</h3>
            <p style={{ fontSize: 13, color: "#A1887F", margin: "0 0 16px" }}>แก้ไขเลขที่ ชื่อ-นามสกุล และชื่อเล่น</p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 14px", background: "#FFFBF5", borderRadius: 12, border: "1px solid #F5E6D3" }}>
              {editing.picture_url ? (
                <img src={editing.picture_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#F9A825" }}>
                  {(editing.display_name || "?")[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: "#A1887F" }}>ชื่อ LINE</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#3E2723" }}>{editing.display_name || "-"}</div>
              </div>
            </div>

            <StudentProfileForm
              studentNumber={studentNumber}
              fullName={fullName}
              nickname={nickname}
              onStudentNumberChange={setStudentNumber}
              onFullNameChange={setFullName}
              onNicknameChange={setNickname}
              disabled={saving}
            />

            <button
              onClick={handleSave}
              disabled={saving || !fullName.trim() || !nickname.trim() || !studentNumber}
              style={{
                width: "100%", marginTop: 20, padding: 14,
                background: saving || !fullName.trim() || !nickname.trim() || !studentNumber ? "#A1887F" : "#FFC107",
                color: "#3E2723", fontSize: 15, fontWeight: 700,
                border: "none", borderRadius: 50, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
