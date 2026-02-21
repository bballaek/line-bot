"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Plus, Clock, CheckCircle2 } from "lucide-react";

type Homework = {
  id: string;
  subject: string;
  title: string;
  due_date: string | null;
  created_at: string;
  user_homeworks: { status: string }[];
};

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน",
  "พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม",
  "กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const toBE = (y: number) => y + 543;

function getMonthKey(d: Date) {
  return `${THAI_MONTHS[d.getMonth()]} ${toBE(d.getFullYear())}`;
}
function getDateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function formatTime(s: string) {
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} น.`;
}

type MonthGroup = { month: string; dateGroups: DateGroup[] };
type DateGroup = { dateKey: string; dayName: string; dateNum: number; items: Homework[] };

function groupHomeworks(homeworks: Homework[]): MonthGroup[] {
  const monthMap = new Map<string, Map<string, { dayName: string; dateNum: number; items: Homework[] }>>();

  homeworks.forEach((hw) => {
    if (!hw.due_date) return;
    const d = new Date(hw.due_date);
    const mKey = getMonthKey(d);
    const dKey = getDateKey(d);

    if (!monthMap.has(mKey)) monthMap.set(mKey, new Map());
    const dateMap = monthMap.get(mKey)!;
    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, { dayName: THAI_DAYS[d.getDay()], dateNum: d.getDate(), items: [] });
    }
    dateMap.get(dKey)!.items.push(hw);
  });

  const result: MonthGroup[] = [];
  monthMap.forEach((dateMap, month) => {
    const dateGroups: DateGroup[] = [];
    dateMap.forEach((val, dateKey) => {
      dateGroups.push({ dateKey, ...val });
    });
    result.push({ month, dateGroups });
  });
  return result;
}

export default function HomeworkListPage() {
  const { isReady, liffError, userId } = useLiff();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && userId) fetchHomeworks();
  }, [isReady, userId]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase
        .from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      const { data, error } = await supabase
        .from("homeworks")
        .select("id, subject, title, due_date, created_at, user_homeworks ( status )")
        .order("due_date", { ascending: false });
      if (error) throw error;
      setHomeworks((data || []).map((hw) => ({ ...hw, user_homeworks: hw.user_homeworks || [] })) as Homework[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const grouped = groupHomeworks(homeworks);

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2563EB", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <ClipboardList size={20} color="#fff" />
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>การบ้านทั้งหมด</span>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>กำลังโหลดข้อมูล...</div>
        ) : homeworks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8", background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <CheckCircle2 size={40} color="#93C5FD" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: "#64748B" }}>ไม่มีการบ้าน</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>กดปุ่มด้านล่างเพื่อสร้างการบ้านใหม่</div>
          </div>
        ) : (
          grouped.map((mg) => (
            <div key={mg.month} style={{ marginBottom: 24 }}>
              {/* Month header */}
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 12, paddingLeft: 4 }}>{mg.month}</h2>

              {mg.dateGroups.map((dg) => (
                <div key={dg.dateKey} style={{ display: "flex", gap: 0, marginBottom: 10 }}>
                  {/* Left: date column (shared for same-day items) */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 14, minWidth: 60, color: "#94A3B8" }}>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{dg.dayName}</span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>{dg.dateNum}</span>
                  </div>

                  {/* Right: homework cards stacked */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {dg.items.map((hw) => {
                      const doneCount = hw.user_homeworks.filter((u) => u.status === "done").length;
                      const totalCount = hw.user_homeworks.length || 1;
                      const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                      const isAllDone = doneCount === totalCount && totalCount > 0;

                      return (
                        <div key={hw.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", marginBottom: 3 }}>{hw.title}</div>
                          {hw.due_date && (
                            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={12} /> ส่งก่อน {formatTime(hw.due_date)}
                            </div>
                          )}
                          {/* Progress */}
                          <div style={{ height: 5, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ height: "100%", width: `${progress}%`, background: isAllDone ? "#3B82F6" : "#93C5FD", borderRadius: 3, transition: "width 0.4s" }} />
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {isAllDone ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <CheckCircle2 size={13} /> อ่านครบทุกคนแล้ว!
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#60A5FA", fontWeight: 600 }}>
                                อ่านแล้ว <span style={{ fontWeight: 700 }}>{doneCount}</span>
                                <span style={{ color: "#CBD5E1" }}>/{totalCount}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button
          onClick={() => (window.location.href = "/add-homework")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}
        >
          <Plus size={18} /> สร้างการบ้าน
        </button>
      </div>
    </div>
  );
}
