"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Plus, Clock, CheckCircle2, Send, X, FileText, Users, MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";

type Homework = {
  id: string; subject: string; title: string; description: string;
  due_date: string | null; created_at: string;
  user_homeworks: { status: string }[];
};
type Group = { id: string; line_group_id: string; group_name: string };

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const toBE = (y: number) => y + 543;
const getMonthKey = (d: Date) => `${THAI_MONTHS[d.getMonth()]} ${toBE(d.getFullYear())}`;
const getDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const formatTime = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} น.`; };

type MonthGroup = { month: string; dateGroups: { dateKey: string; dayName: string; dateNum: number; items: Homework[] }[] };

function groupHomeworks(homeworks: Homework[]): MonthGroup[] {
  const mm = new Map<string, Map<string, { dayName: string; dateNum: number; items: Homework[] }>>();
  homeworks.forEach((hw) => {
    if (!hw.due_date) return;
    const d = new Date(hw.due_date);
    const mK = getMonthKey(d), dK = getDateKey(d);
    if (!mm.has(mK)) mm.set(mK, new Map());
    const dm = mm.get(mK)!;
    if (!dm.has(dK)) dm.set(dK, { dayName: THAI_DAYS[d.getDay()], dateNum: d.getDate(), items: [] });
    dm.get(dK)!.items.push(hw);
  });
  const r: MonthGroup[] = [];
  mm.forEach((dm, m) => { const dgs: any[] = []; dm.forEach((v, k) => dgs.push({ dateKey: k, ...v })); r.push({ month: m, dateGroups: dgs }); });
  return r;
}

export default function HomeworkListPage() {
  const { isReady, liffError, userId } = useLiff();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  // Send modal state
  const [showSend, setShowSend] = useState(false);
  const [sendStep, setSendStep] = useState<"choose" | "groups" | "pick">("choose");
  const [sendMode, setSendMode] = useState<"single" | "daily">("daily");
  const [sendHw, setSendHw] = useState<Homework | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { if (isReady && userId) fetchHomeworks(); }, [isReady, userId]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      const { data, error } = await supabase.from("homeworks")
        .select("id, subject, title, description, due_date, created_at, user_homeworks ( status )")
        .order("due_date", { ascending: false });
      if (error) throw error;
      setHomeworks((data || []).map((hw) => ({ ...hw, user_homeworks: hw.user_homeworks || [] })) as Homework[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try { const res = await fetch("/api/groups"); const data = await res.json(); setGroups(data.groups || []); }
    catch { setGroups([]); } finally { setLoadingGroups(false); }
  };

  // Send via bot pushMessage
  const sendToTarget = async (targetId: string) => {
    setSending(true);
    try {
      const body = sendMode === "daily"
        ? { targetId, homework: homeworks, type: "daily" }
        : { targetId, homework: sendHw };
      const res = await fetch("/api/send-homework", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      alert("ส่งสำเร็จ!");
      setShowSend(false);
    } catch (e: any) { alert("ส่งไม่สำเร็จ: " + (e.message || "")); }
    finally { setSending(false); }
  };

  const openSendSingle = (hw: Homework) => {
    setSendHw(hw); setSendMode("single"); setSendStep("choose"); setShowSend(true);
  };
  const openSendDaily = () => {
    setSendMode("daily"); setSendStep("choose"); setShowSend(true);
  };

  const grouped = groupHomeworks(homeworks);

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2563EB", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ClipboardList size={20} color="#fff" />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>การบ้านทั้งหมด</span>
        </div>
        {homeworks.length > 0 && (
          <button onClick={openSendDaily} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Send size={14} /> ส่ง
          </button>
        )}
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
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 12, paddingLeft: 4 }}>{mg.month}</h2>
              {mg.dateGroups.map((dg) => (
                <div key={dg.dateKey} style={{ display: "flex", gap: 0, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 14, minWidth: 60, color: "#94A3B8" }}>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{dg.dayName}</span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>{dg.dateNum}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {dg.items.map((hw) => {
                      const doneCount = hw.user_homeworks.filter((u) => u.status === "done").length;
                      const totalCount = hw.user_homeworks.length || 1;
                      const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                      const isAllDone = doneCount === totalCount && totalCount > 0;
                      return (
                        <div key={hw.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", marginBottom: 3, flex: 1 }}>{hw.title}</div>
                            <button onClick={() => openSendSingle(hw)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", padding: "2px 4px" }}>
                              <Send size={15} />
                            </button>
                          </div>
                          {hw.due_date && (
                            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={12} /> ส่งก่อน {formatTime(hw.due_date)}
                            </div>
                          )}
                          <div style={{ height: 5, background: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ height: "100%", width: `${progress}%`, background: isAllDone ? "#3B82F6" : "#93C5FD", borderRadius: 3, transition: "width 0.4s" }} />
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {isAllDone ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <CheckCircle2 size={13} /> อ่านครบทุกคนแล้ว!</span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#60A5FA", fontWeight: 600 }}>อ่านแล้ว <span style={{ fontWeight: 700 }}>{doneCount}</span><span style={{ color: "#CBD5E1" }}>/{totalCount}</span></span>
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
        <button onClick={() => (window.location.href = "/add-homework")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
          <Plus size={18} /> สร้างการบ้าน
        </button>
      </div>

      {/* Send Modal */}
      {showSend && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => setShowSend(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>

            {sendStep === "choose" ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 4, textAlign: "center" }}>
                  {sendMode === "daily" ? "ส่งรายงานการบ้าน" : `ส่ง: ${sendHw?.title}`}
                </h3>
                <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginBottom: 16 }}>บอทจะส่งข้อความเข้าแชทให้</p>

                <button onClick={() => userId && sendToTarget(userId)} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} /> {sending ? "กำลังส่ง..." : "ส่งเข้าแชทตัวเอง"}
                </button>
                <button onClick={() => { setSendStep("groups"); fetchGroups(); }}
                  style={{ width: "100%", padding: "12px 16px", background: "#fff", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Users size={18} color="#2563EB" /> ส่งเข้าแชทกลุ่ม</span>
                  <ChevronRight size={16} color="#94A3B8" />
                </button>
              </>
            ) : sendStep === "groups" ? (
              <>
                <button onClick={() => setSendStep("choose")} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, padding: 0, fontSize: 13 }}><ArrowLeft size={16} /> กลับ</button>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>เลือกกลุ่ม</h3>
                {loadingGroups ? <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8" }}>กำลังโหลด...</div>
                : groups.length === 0 ? <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 13 }}>ยังไม่มีกลุ่ม กรุณาเพิ่ม Bot เข้ากลุ่ม LINE ก่อน</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {groups.map((g) => (
                      <button key={g.id} onClick={() => sendToTarget(g.line_group_id)} disabled={sending}
                        style={{ width: "100%", padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontWeight: 500 }}>
                        <Users size={16} color="#2563EB" /> {g.group_name}
                      </button>
                    ))}
                  </div>
                }
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
