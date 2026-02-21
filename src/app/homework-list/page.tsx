"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Plus, Clock, CheckCircle2, Send, X, FileText } from "lucide-react";
import liff from "@line/liff";

type Homework = {
  id: string; subject: string; title: string; description: string;
  due_date: string | null; created_at: string;
  user_homeworks: { status: string }[];
};

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const toBE = (y: number) => y + 543;
const getMonthKey = (d: Date) => `${THAI_MONTHS[d.getMonth()]} ${toBE(d.getFullYear())}`;
const getDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const formatTime = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} น.`; };
const formatDateShort = (s: string) => { const d = new Date(s); return `${d.getDate()}/${d.getMonth()+1}/${toBE(d.getFullYear()) % 100}`; };

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

// Build Flex Message for shareTargetPicker
function buildHomeworkFlexForShare(hw: Homework) {
  const dueText = hw.due_date
    ? new Date(hw.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'ไม่ระบุ';

  return {
    type: 'flex' as const,
    altText: `📋 การบ้าน: ${hw.title}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
        contents: [
          { type: 'text', text: 'การบ้านใหม่', color: '#DBEAFE', size: 'xs', weight: 'bold' },
          { type: 'text', text: hw.title, color: '#ffffff', size: 'lg', weight: 'bold', wrap: true },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
        contents: [
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'วิชา', size: 'sm', color: '#94A3B8', flex: 2 },
            { type: 'text', text: hw.subject, size: 'sm', color: '#1E293B', flex: 5, weight: 'bold' },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'กำหนดส่ง', size: 'sm', color: '#94A3B8', flex: 2 },
            { type: 'text', text: dueText, size: 'sm', color: '#1E293B', flex: 5, wrap: true },
          ]},
          ...(hw.description ? [{ type: 'separator' as const, margin: 'md' as const }, {
            type: 'text' as const, text: hw.description.length > 150 ? hw.description.substring(0, 150) + '...' : hw.description,
            size: 'sm' as const, color: '#64748B', wrap: true, marginTop: 'md' as const,
          }] : []),
        ],
      },
    },
  };
}

function buildDailyReportFlexForShare(homeworks: Homework[]) {
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const items = homeworks.slice(0, 8).map((hw) => ({
    type: 'box' as const, layout: 'horizontal' as const, spacing: 'sm' as const, paddingBottom: '8px',
    contents: [
      { type: 'text' as const, text: '•', size: 'sm' as const, color: '#2563EB', flex: 1 },
      { type: 'box' as const, layout: 'vertical' as const, flex: 9, contents: [
        { type: 'text' as const, text: hw.title, size: 'sm' as const, color: '#1E293B', weight: 'bold' as const, wrap: true },
        { type: 'text' as const, text: `วิชา ${hw.subject}${hw.due_date ? ' • กำหนด ' + formatDateShort(hw.due_date) : ''}`, size: 'xs' as const, color: '#94A3B8' },
      ]},
    ],
  }));

  return {
    type: 'flex' as const,
    altText: `📋 รายงานการบ้านประจำวัน ${today}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
        contents: [
          { type: 'text', text: 'รายงานการบ้านประจำวัน', color: '#DBEAFE', size: 'xs', weight: 'bold' },
          { type: 'text', text: today, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: `ทั้งหมด ${homeworks.length} รายการ`, color: '#93C5FD', size: 'xs', marginTop: '4px' },
        ],
      },
      body: { type: 'box', layout: 'vertical', paddingAll: '16px', contents: items },
    },
  };
}

export default function HomeworkListPage() {
  const { isReady, liffError, userId } = useLiff();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);

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

  // Use LIFF shareTargetPicker to send Flex Message
  const shareHomework = async (hw: Homework) => {
    try {
      if (!liff.isApiAvailable('shareTargetPicker')) {
        alert('กรุณาเปิดใน LINE app เพื่อใช้ฟีเจอร์นี้');
        return;
      }
      const msg = buildHomeworkFlexForShare(hw);
      await liff.shareTargetPicker([msg as any]);
    } catch (e: any) {
      console.error('Share error:', e);
      alert('ส่งไม่สำเร็จ: ' + (e.message || ''));
    }
  };

  const shareDailyReport = async () => {
    try {
      if (!liff.isApiAvailable('shareTargetPicker')) {
        alert('กรุณาเปิดใน LINE app เพื่อใช้ฟีเจอร์นี้');
        return;
      }
      const msg = buildDailyReportFlexForShare(homeworks);
      await liff.shareTargetPicker([msg as any]);
      setShowSend(false);
    } catch (e: any) {
      console.error('Share error:', e);
      alert('ส่งไม่สำเร็จ: ' + (e.message || ''));
    }
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
          <button onClick={() => setShowSend(true)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
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
                            <button onClick={() => shareHomework(hw)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", padding: "2px 4px" }}>
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 4, textAlign: "center" }}>ส่งการบ้าน</h3>
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginBottom: 16 }}>เลือกรูปแบบการส่ง</p>

            <button onClick={shareDailyReport}
              style={{ width: "100%", padding: "12px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList size={18} /> ส่งรายงานประจำวัน
            </button>

            <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginBottom: 8 }}>หรือเลือกส่งเฉพาะงาน</p>
            <div style={{ maxHeight: 200, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {homeworks.map((hw) => (
                <button key={hw.id} onClick={() => { setShowSend(false); shareHomework(hw); }}
                  style={{ width: "100%", padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#1E293B", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={14} color="#2563EB" /> {hw.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
