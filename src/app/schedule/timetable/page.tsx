"use client";

import React, { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/lib/supabase";
import SettingsLayout from "@/components/settings/SettingsLayout";
import { ArrowLeft, Send, X, MessageSquare, Users, ChevronRight, Clock, BookOpen, User, Edit3, Check, Trash2, CalendarDays } from "lucide-react";

type Schedule = {
  id?: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
};
type Group = { id: string; line_group_id: string; group_name: string };

const DAYS = [
  { label: "จันทร์", short: "จ", value: 1 },
  { label: "อังคาร", short: "อ", value: 2 },
  { label: "พุธ", short: "พ", value: 3 },
  { label: "พฤหัสบดี", short: "พฤ", value: 4 },
  { label: "ศุกร์", short: "ศ", value: 5 },
];

const DEFAULT_TIMES: { start: string; end: string }[] = [
  { start: "08:30", end: "09:20" },
  { start: "09:20", end: "10:10" },
  { start: "10:10", end: "11:00" },
  { start: "11:00", end: "11:50" },
  { start: "12:40", end: "13:30" },
  { start: "13:30", end: "14:20" },
  { start: "14:20", end: "15:10" },
  { start: "15:10", end: "16:00" },
];

export default function SchedulePage() {
  const { isReady, liffError, userId } = useLiff();
  const { canManageClass } = useAppUser();
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 5 ? d : 1;
  });
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editPeriod, setEditPeriod] = useState<number | null>(null);
  const [editData, setEditData] = useState({ start_time: "", end_time: "", subject: "", teacher: "" });
  const [saving, setSaving] = useState(false);

  // Send modal
  const [showSend, setShowSend] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState<"choose" | "groups">("choose");

  useEffect(() => {
    if (isReady && userId) fetchUser();
  }, [isReady, userId]);

  useEffect(() => {
    if (dbUserId) fetchSchedules();
  }, [dbUserId, selectedDay]);

  const fetchUser = async () => {
    const { data } = await supabase.from("users").select("id").eq("line_user_id", userId as string).single();
    if (data) setDbUserId(data.id);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("class_schedules")
        .select("*")
        .eq("user_id", dbUserId)
        .eq("day_of_week", selectedDay)
        .order("period");
      setSchedules(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getScheduleForPeriod = (period: number): Schedule | undefined => {
    return schedules.find(s => s.period === period);
  };

  const openEdit = (period: number) => {
    const existing = getScheduleForPeriod(period);
    setEditData({
      start_time: existing?.start_time || DEFAULT_TIMES[period - 1].start,
      end_time: existing?.end_time || DEFAULT_TIMES[period - 1].end,
      subject: existing?.subject || "",
      teacher: existing?.teacher || "",
    });
    setEditPeriod(period);
  };

  const handleSave = async () => {
    if (!dbUserId || editPeriod === null) return;
    setSaving(true);
    try {
      const existing = getScheduleForPeriod(editPeriod);
      if (existing?.id) {
        await supabase.from("class_schedules").update({
          start_time: editData.start_time,
          end_time: editData.end_time,
          subject: editData.subject,
          teacher: editData.teacher,
        }).eq("id", existing.id);
      } else {
        await supabase.from("class_schedules").insert({
          user_id: dbUserId,
          day_of_week: selectedDay,
          period: editPeriod,
          ...editData,
        });
      }
      await fetchSchedules();
      setEditPeriod(null);
    } catch (e: any) { alert("บันทึกไม่สำเร็จ: " + (e.message || "")); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editPeriod) return;
    const existing = getScheduleForPeriod(editPeriod);
    if (!existing?.id) { setEditPeriod(null); return; }
    setSaving(true);
    try {
      await supabase.from("class_schedules").delete().eq("id", existing.id);
      await fetchSchedules();
      setEditPeriod(null);
    } catch (e: any) { alert("ลบไม่สำเร็จ: " + (e.message || "")); }
    finally { setSaving(false); }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try { const res = await fetch("/api/groups"); const data = await res.json(); setGroups(data.groups || []); }
    catch { setGroups([]); } finally { setLoadingGroups(false); }
  };

  const sendToTarget = async (targetId: string) => {
    setSending(true);
    try {
      const dayLabel = DAYS.find(d => d.value === selectedDay)?.label || "";
      const res = await fetch("/api/send-schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, dayName: dayLabel, dayOfWeek: selectedDay, schedules }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      alert("ส่งสำเร็จ!"); setShowSend(false);
    } catch (e: any) { alert("ส่งไม่สำเร็จ: " + (e.message || "")); }
    finally { setSending(false); }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;

  const dayLabel = DAYS.find(d => d.value === selectedDay)?.label || "";
  const filledCount = schedules.filter(s => s.subject).length;

  return (
    <>
      <SettingsLayout title="ห้องเรียน" breadcrumb="ตารางเรียน" backHref="/schedule">
      <div style={{ margin: "-8px 0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ color: "#A1887F", fontSize: 13 }}>{filledCount}/8 คาบ</span>
        </div>
      </div>

      {/* Day Tabs */}
      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", background: "#F5E6D3", borderRadius: 20, padding: 4, width: "100%", maxWidth: 400 }}>
          {DAYS.map(day => (
            <div key={day.value} onClick={() => setSelectedDay(day.value)}
              style={{
                flex: 1, textAlign: "center", padding: "8px 0", fontSize: 13,
                fontWeight: selectedDay === day.value ? 600 : 500,
                color: selectedDay === day.value ? "#3E2723" : "#795548",
                background: selectedDay === day.value ? "#FFFFFF" : "transparent",
                borderRadius: 16, cursor: "pointer",
                boxShadow: selectedDay === day.value ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s"
              }}
            >
              {day.label}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Table */}
      <div style={{ padding: `0 0 ${canManageClass && filledCount > 0 ? 88 : 16}px` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 12, paddingLeft: 4 }}>
          วัน{dayLabel}
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#A1887F" }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
              const sched = getScheduleForPeriod(period);
              const hasData = sched && sched.subject;
              const timeStr = sched?.start_time && sched?.end_time
                ? `${sched.start_time}-${sched.end_time}`
                : `${DEFAULT_TIMES[period - 1].start}-${DEFAULT_TIMES[period - 1].end}`;

              return (
                <div key={period} onClick={() => openEdit(period)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: "#fff", borderRadius: 12, border: "1px solid #F5E6D3",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {/* Period badge */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: hasData ? "#FFC107" : "#F5E6D3",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14,
                    color: hasData ? "#fff" : "#A1887F",
                    flexShrink: 0,
                  }}>
                    {period}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: hasData ? 600 : 400, color: hasData ? "#3E2723" : "#A1887F" }}>
                      {hasData ? sched.subject : "ว่าง"}
                    </div>
                    <div style={{ fontSize: 12, color: "#A1887F", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> {timeStr}</span>
                      {hasData && sched.teacher && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><User size={11} /> {sched.teacher}</span>
                      )}
                    </div>
                  </div>

                  {/* Edit icon */}
                  <Edit3 size={16} color="#D7CCC8" />
                </div>
              );
            })}
          </div>
        )}
      </div>
      </SettingsLayout>

      {canManageClass && filledCount > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #F5E6D3", zIndex: 100 }}>
          <button onClick={() => { setSendStep("choose"); setShowSend(true); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#FFC107", color: "#3E2723", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
            <Send size={18} /> ส่งตารางเข้า LINE
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editPeriod !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditPeriod(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px", maxWidth: 360, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditPeriod(null)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#A1887F" }}><X size={20} /></button>

            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", marginBottom: 4 }}>คาบที่ {editPeriod}</h3>
            <p style={{ fontSize: 13, color: "#A1887F", marginBottom: 16, marginTop: 0 }}>วัน{dayLabel}</p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 4, display: "block" }}>เวลาเรียน</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="time" value={editData.start_time} onChange={e => setEditData(d => ({ ...d, start_time: e.target.value }))}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 14, background: "#fff", outline: "none" }} />
                <span style={{ color: "#A1887F" }}>-</span>
                <input type="time" value={editData.end_time} onChange={e => setEditData(d => ({ ...d, end_time: e.target.value }))}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 14, background: "#fff", outline: "none" }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}><BookOpen size={13} /> ชื่อวิชา</label>
              <input type="text" placeholder="เช่น คณิตศาสตร์" value={editData.subject} onChange={e => setEditData(d => ({ ...d, subject: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}><User size={13} /> ครูผู้สอน</label>
              <input type="text" placeholder="เช่น ครูสมชาย" value={editData.teacher} onChange={e => setEditData(d => ({ ...d, teacher: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {getScheduleForPeriod(editPeriod)?.id && (
                <button onClick={handleDelete} disabled={saving}
                  style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={18} color="#E53935" />
                </button>
              )}
              <button onClick={handleSave} disabled={saving || !editData.subject.trim()}
                style={{ flex: 1, padding: 12, background: !editData.subject.trim() ? "#A1887F" : "#FFC107", color: "#3E2723", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: !editData.subject.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => setShowSend(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#A1887F" }}><X size={20} /></button>

            {sendStep === "choose" ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#FFF8E1", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CalendarDays size={32} color="#FFC107" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", marginBottom: 4 }}>ส่งตารางวัน{dayLabel}</h3>
                  <p style={{ fontSize: 13, color: "#A1887F", lineHeight: 1.6, margin: 0 }}>บอทจะส่ง Flex Message เข้าแชทให้</p>
                </div>
                <button onClick={() => userId && sendToTarget(userId)} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#FFC107", color: "#3E2723", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} /> {sending ? "กำลังส่ง..." : "ส่งเข้าแชทตัวเอง"}
                </button>
                <button onClick={() => { setSendStep("groups"); fetchGroups(); }} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#fff", color: "#3E2723", border: "1px solid #F5E6D3", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Users size={18} color="#FFC107" /> ส่งเข้าแชทกลุ่ม</span>
                  <ChevronRight size={16} color="#A1887F" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSendStep("choose")} style={{ background: "none", border: "none", cursor: "pointer", color: "#5D4037", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, padding: 0, fontSize: 13 }}><ArrowLeft size={16} /> กลับ</button>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 12 }}>เลือกกลุ่ม</h3>
                {loadingGroups ? <div style={{ textAlign: "center", padding: "20px 0", color: "#A1887F" }}>กำลังโหลด...</div>
                : groups.length === 0 ? <div style={{ textAlign: "center", padding: "20px 0", color: "#A1887F", fontSize: 13 }}>ยังไม่มีกลุ่ม กรุณาเพิ่ม Bot เข้ากลุ่ม LINE ก่อน</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {groups.map((g) => (
                      <button key={g.id} onClick={() => sendToTarget(g.line_group_id)} disabled={sending}
                        style={{ width: "100%", padding: "12px 14px", background: "#FFFBF5", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 14, color: "#3E2723", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontWeight: 500 }}>
                        <Users size={16} color="#FFC107" /> {g.group_name}
                      </button>
                    ))}
                  </div>
                }
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
