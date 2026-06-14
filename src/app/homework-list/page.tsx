"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Plus, CheckCircle2, Send, X, MessageSquare, Users, ChevronRight, ArrowLeft, Clock, BookOpen } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useAppUser } from "@/hooks/useAppUser";
import BottomNav, { bottomNavOffset } from "@/components/BottomNav";

type Homework = {
  id: string; subject: string; title: string; description: string;
  target_group?: string;
  created_by?: string;
  due_date: string | null; created_at: string;
  user_homeworks: { status: string }[];
};
type Group = { id: string; line_group_id: string; group_name: string };

const THAI_MONTHS_LONG = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const toBE = (y: number) => y + 543;
const getMonthKey = (d: Date) => `${THAI_MONTHS_LONG[d.getMonth()]} ${toBE(d.getFullYear())}`;
const getDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const formatTime = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} น.`; };

type MonthGroup = { month: string; dateGroups: { dateKey: string; dayName: string; dateNum: number; items: Homework[] }[] };

function groupHomeworks(homeworks: Homework[]): MonthGroup[] {
  const mm = new Map<string, Map<string, { dayName: string; dateNum: number; items: Homework[] }>>();
  homeworks.forEach((hw) => {
    const ref = hw.due_date || hw.created_at;
    const d = new Date(ref);
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
  const { canManageClass, loading: userLoading } = useAppUser();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);

  const [showSend, setShowSend] = useState(false);
  const [sendStep, setSendStep] = useState<"choose" | "groups">("choose");
  const [sendMode, setSendMode] = useState<"single" | "daily">("daily");
  const [sendHw, setSendHw] = useState<Homework | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);

  const [readingHw, setReadingHw] = useState<Homework | null>(null);

  useEffect(() => { if (isReady && userId) fetchHomeworks(); }, [isReady, userId]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      setCurrentDbUserId(userData.id);

      const { data: settingsData } = await supabase.from("user_settings").select("target_group").eq("user_id", userData.id).single();
      const userGroup = settingsData?.target_group || "All";
      setActiveTab(userGroup);

      const { data, error } = await supabase.from("homeworks")
        .select("id, subject, title, description, target_group, created_by, due_date, created_at, user_homeworks ( status )")
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
      alert("ส่งสำเร็จ!"); setShowSend(false);
    } catch (e: any) { alert("ส่งไม่สำเร็จ: " + (e.message || "")); }
    finally { setSending(false); }
  };

  const openSendSingle = (hw: Homework) => { setSendHw(hw); setSendMode("single"); setSendStep("choose"); setShowSend(true); };
  const openSendDaily = () => { setSendMode("daily"); setSendStep("choose"); setShowSend(true); };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;

  const hasOwnHomework = !!currentDbUserId && homeworks.some((hw) => hw.created_by === currentDbUserId);
  const canSendHomework = canManageClass || hasOwnHomework;
  const showSendFooter = canSendHomework && homeworks.length > 0;
  const footerExtra = (canManageClass ? 72 : 0) + (showSendFooter ? 58 : 0);

  const filteredHomeworks = homeworks.filter((hw) => {
    if (activeTab === "All") return true;
    return !hw.target_group || hw.target_group === "All" || hw.target_group === activeTab;
  });

  const grouped = groupHomeworks(filteredHomeworks);

  return (
    <div style={{ minHeight: "100vh", background: "#FFF9F0", paddingBottom: bottomNavOffset(footerExtra) }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 8px", textAlign: "center" }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: 0 }}>การบ้านทั้งหมด</h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
          <span style={{ color: "#A1887F", fontSize: 13 }}>{homeworks.length} รายการ</span>
          {showSendFooter && (
            <button onClick={openSendDaily} style={{ background: "#FFF8E1", border: "1px solid #F5E6D3", borderRadius: 8, padding: "4px 10px", color: "#5D4037", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Send size={12} /> ส่งรายงาน
            </button>
          )}
        </div>
      </div>

      {/* Current Date/Time */}
      <div style={{ textAlign: "center", padding: "14px 16px 0", fontSize: 15, fontWeight: 600, color: "#3E2723" }}>
        {(() => {
          const now = new Date();
          const day = THAI_DAYS[now.getDay()];
          const date = now.getDate();
          const month = THAI_MONTHS_LONG[now.getMonth()];
          const year = toBE(now.getFullYear());
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          return `วัน${day} ที่ ${date} ${month} ${year} เวลา ${hours}:${minutes} น.`;
        })()}
      </div>

      {/* Target Group Filter (Segmented Control) */}
      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", background: "#F5E6D3", borderRadius: 20, padding: 4, width: "100%", maxWidth: 320 }}>
          {["All", "Group A", "Group B"].map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                fontSize: 14,
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? "#3E2723" : "#795548",
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                borderRadius: 16,
                cursor: "pointer",
                boxShadow: activeTab === tab ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s"
              }}
            >
              {tab === "All" ? "ทั้งหมด" : tab}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#A1887F" }}>กำลังโหลดข้อมูล...</div>
        ) : homeworks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#A1887F", background: "#fff", borderRadius: 14, border: "1px solid #F5E6D3" }}>
            <ClipboardList size={40} color="#FFE082" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: "#795548" }}>ไม่มีการบ้าน</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {canManageClass ? "กดปุ่มด้านล่างเพื่อสร้างการบ้านใหม่" : "รอครูมอบหมายการบ้าน"}
            </div>
          </div>
        ) : (
          grouped.map((mg) => (
            <div key={mg.month} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 12, paddingLeft: 4 }}>{mg.month}</h2>
              {mg.dateGroups.map((dg) => (
                <div key={dg.dateKey} style={{ display: "flex", gap: 0, marginBottom: 10 }}>
                  {/* Date column */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 14, minWidth: 56, color: "#A1887F" }}>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{dg.dayName}</span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#3E2723", lineHeight: 1.2 }}>{dg.dateNum}</span>
                  </div>
                  {/* Cards column */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {dg.items.map((hw) => {
                      const doneCount = hw.user_homeworks.filter((u) => u.status === "done").length;
                      const totalCount = hw.user_homeworks.length || 0;
                      const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                      const isAllDone = doneCount === totalCount && totalCount > 0;

                      return (
                        <div key={hw.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #F5E6D3", overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }} onClick={() => (window.location.href = `/homework-list/${hw.id}`)}>
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, color: "#3E2723", flex: 1 }}>{hw.title}</div>
                              {canSendHomework && (
                                <button onClick={(e) => { e.stopPropagation(); openSendSingle(hw); }} style={{ background: "#FFF8E1", border: "1px solid #F5E6D3", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "#F9A825", display: "flex", alignItems: "center", flexShrink: 0 }} title="ส่งเข้า LINE">
                                  <Send size={15} />
                                </button>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FFF8E1", borderRadius: 6, padding: "2px 8px" }}>
                                <BookOpen size={10} color="#F9A825" />
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#F9A825" }}>{hw.subject}</span>
                              </div>
                              {hw.target_group && hw.target_group !== "All" && (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FEF2F2", borderRadius: 6, padding: "2px 8px" }}>
                                  <Users size={10} color="#E11D48" />
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#E11D48" }}>{hw.target_group}</span>
                                </div>
                              )}
                            </div>

                            {hw.description && (
                              <div style={{ margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                <MarkdownRenderer content={hw.description} isPreview={true} />
                              </div>
                            )}

                            {hw.due_date && (
                              <div style={{ fontSize: 12, color: "#A1887F", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={12} /> ส่งก่อน {formatTime(hw.due_date)}
                              </div>
                            )}

                            {totalCount > 0 && (
                              <>
                                <div style={{ height: 5, background: "#F5E6D3", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                                  <div style={{ height: "100%", width: `${progress}%`, background: isAllDone ? "#F9A825" : "#FFE082", borderRadius: 3, transition: "width 0.4s" }} />
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {isAllDone ? (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#F9A825", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <CheckCircle2 size={12} /> อ่านครบแล้ว!</span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "#FFB74D", fontWeight: 600 }}>อ่านแล้ว {doneCount}/{totalCount}</span>
                                  )}
                                </div>
                              </>
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

      {/* Footer */}
      {(canManageClass || showSendFooter) && (
      <div style={{ position: "fixed", bottom: bottomNavOffset(), left: 0, right: 0, padding: "12px 20px", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #F5E6D3", zIndex: 100, display: "flex", flexDirection: "column", gap: 8 }}>
        {showSendFooter && (
          <button onClick={openSendDaily}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#fff", color: "#3E2723", fontSize: 15, fontWeight: 700, border: "1px solid #F5E6D3", borderRadius: 50, cursor: "pointer" }}>
            <Send size={18} color="#F9A825" /> ส่งรายงานการบ้าน
          </button>
        )}
        {canManageClass && (
        <button onClick={() => (window.location.href = "/add-homework")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#FFC107", color: "#3E2723", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
          <Plus size={18} /> สร้างการบ้าน
        </button>
        )}
      </div>
      )}

      <BottomNav />

      {/* Reading Modal */}
      {readingHw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setReadingHw(null)}>
          <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #F5E6D3" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: 0 }}>รายละเอียดการบ้าน</h3>
              <button onClick={() => setReadingHw(null)} style={{ background: "#FFF9F0", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#795548" }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#3E2723", marginBottom: 12 }}>{readingHw.title}</h2>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF8E1", borderRadius: 8, padding: "6px 12px" }}>
                  <BookOpen size={14} color="#F9A825" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#F9A825" }}>{readingHw.subject}</span>
                </div>
                {readingHw.target_group && readingHw.target_group !== "All" && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FEF2F2", borderRadius: 8, padding: "6px 12px" }}>
                    <Users size={14} color="#E11D48" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#E11D48" }}>{readingHw.target_group}</span>
                  </div>
                )}
                {readingHw.due_date && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFBF5", border: "1px solid #F5E6D3", borderRadius: 8, padding: "5px 12px" }}>
                    <Clock size={14} color="#795548" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#5D4037" }}>ส่งก่อน {formatTime(readingHw.due_date)}</span>
                  </div>
                )}
              </div>

              <div style={{ background: "#FFFBF5", padding: 20, borderRadius: 12, border: "1px solid #F5E6D3" }}>
                {readingHw.description ? <MarkdownRenderer content={readingHw.description} /> : <span style={{ color: "#A1887F", fontStyle: "italic" }}>ไม่มีรายละเอียดเพิ่มเติมชิ้นนี้</span>}
              </div>
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
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 4, textAlign: "center" }}>
                  {sendMode === "daily" ? "ส่งรายงานการบ้าน" : `ส่ง: ${sendHw?.title}`}
                </h3>
                <p style={{ fontSize: 13, color: "#A1887F", textAlign: "center", marginBottom: 16 }}>บอทจะส่งข้อความเข้าแชทให้</p>

                <button onClick={() => userId && sendToTarget(userId)} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#FFC107", color: "#3E2723", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} /> {sending ? "กำลังส่ง..." : "ส่งเข้าแชทตัวเอง"}
                </button>
                <button onClick={() => { setSendStep("groups"); fetchGroups(); }}
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
    </div>
  );
}
