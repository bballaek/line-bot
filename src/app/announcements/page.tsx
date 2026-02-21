"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { Megaphone, Plus, CalendarDays, ChevronRight, AlertCircle, FileEdit, Send, X, MessageSquare, Users, ArrowLeft } from "lucide-react";

type Announcement = {
  id: string; title: string; content: string; pinned: boolean; created_at: string;
};
type Group = { id: string; line_group_id: string; group_name: string };

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatDate(s);
}

export default function AnnouncementsPage() {
  const { isReady, liffError, userId } = useLiff();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Send modal state
  const [showSend, setShowSend] = useState(false);
  const [sendStep, setSendStep] = useState<"choose" | "groups">("choose");
  const [sendAnn, setSendAnn] = useState<Announcement | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { if (isReady && userId) fetchAnnouncements(); }, [isReady, userId]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("announcements").select("id, title, content, pinned, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try { const res = await fetch("/api/groups"); const data = await res.json(); setGroups(data.groups || []); }
    catch { setGroups([]); } finally { setLoadingGroups(false); }
  };

  const openSend = (ann: Announcement) => {
    setSendAnn(ann); setSendStep("choose"); setShowSend(true);
  };

  const sendToTarget = async (targetId: string) => {
    if (!sendAnn) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-announcement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, announcement: { title: sendAnn.title, content: sendAnn.content, type: sendAnn.pinned ? "action" : "info" } }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      alert("ส่งสำเร็จ!");
      setShowSend(false);
    } catch (e: any) { alert("ส่งไม่สำเร็จ: " + (e.message || "")); }
    finally { setSending(false); }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  const pinnedItems = items.filter((a) => a.pinned);
  const normalItems = items.filter((a) => !a.pinned);

  const renderCard = (ann: Announcement, isPinned: boolean) => (
    <div key={ann.id} style={{ background: isPinned ? "#FFFBEB" : "#fff", borderRadius: 14, border: `1px solid ${isPinned ? "#FDE68A" : "#E2E8F0"}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div onClick={() => (window.location.href = `/announcements/${ann.id}`)}
            style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", flex: 1, cursor: "pointer" }}>{ann.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); openSend(ann); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: isPinned ? "#D97706" : "#93C5FD", padding: "2px 4px" }}>
              <Send size={15} />
            </button>
            <ChevronRight size={16} color={isPinned ? "#D97706" : "#CBD5E1"} onClick={() => (window.location.href = `/announcements/${ann.id}`)} style={{ cursor: "pointer" }} />
          </div>
        </div>
        {ann.content && (
          <p onClick={() => (window.location.href = `/announcements/${ann.id}`)}
            style={{ fontSize: 13, color: isPinned ? "#78716C" : "#64748B", margin: "0 0 8px", lineHeight: 1.5, cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ann.content}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isPinned ? "#B45309" : "#94A3B8" }}>
          <CalendarDays size={11} /> {timeAgo(ann.created_at)}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2563EB", padding: "18px 20px 16px", borderRadius: "0 0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Megaphone size={22} color="#fff" />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>ประกาศ</span>
          </div>
          <span style={{ color: "#93C5FD", fontSize: 13 }}>{items.length} รายการ</span>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8", background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <Megaphone size={40} color="#93C5FD" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: "#64748B" }}>ยังไม่มีประกาศ</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>กดปุ่มด้านล่างเพื่อสร้างประกาศใหม่</div>
          </div>
        ) : (
          <>
            {pinnedItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
                  <AlertCircle size={14} color="#D97706" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706" }}>แจ้งเพื่อดำเนินการ</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pinnedItems.map((ann) => renderCard(ann, true))}
                </div>
              </div>
            )}
            {normalItems.length > 0 && (
              <div>
                {pinnedItems.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
                    <FileEdit size={14} color="#3B82F6" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6" }}>แจ้งเพื่อทราบ</span>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {normalItems.map((ann) => renderCard(ann, false))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={() => (window.location.href = "/announcements/create")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
          <Plus size={18} /> สร้างประกาศ
        </button>
      </div>

      {/* Send Modal */}
      {showSend && sendAnn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => setShowSend(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>

            {sendStep === "choose" ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 4, textAlign: "center" }}>
                  ส่งประกาศ: {sendAnn.title}
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
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
