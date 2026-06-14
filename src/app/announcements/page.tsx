"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { Megaphone, Plus, CalendarDays, ChevronRight, AlertCircle, FileEdit, Send, X, MessageSquare, Users, ArrowLeft } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useAppUser } from "@/hooks/useAppUser";
import BottomNav, { bottomNavOffset } from "@/components/BottomNav";

type Announcement = {
  id: string; title: string; content: string; pinned: boolean; created_at: string; created_by: string;
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
  const { canManageClass } = useAppUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

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
      if (!userId) return;
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId).single();
      if (!userData) return;
      setDbUserId(userData.id);

      const { data, error } = await supabase
        .from("announcements").select("id, title, content, pinned, created_at, created_by")
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
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;

  const pinnedItems = items.filter((a) => a.pinned);
  const normalItems = items.filter((a) => !a.pinned);

  const renderCard = (ann: Announcement, isPinned: boolean) => (
    <div key={ann.id} style={{ background: isPinned ? "#FFFBEB" : "#fff", borderRadius: 14, border: `1px solid ${isPinned ? "#FDE68A" : "#F5E6D3"}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div onClick={() => (window.location.href = `/announcements/${ann.id}`)}
            style={{ fontWeight: 700, fontSize: 15, color: "#3E2723", flex: 1, cursor: "pointer" }}>{ann.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {canManageClass && (
              <button onClick={(e) => { e.stopPropagation(); openSend(ann); }}
                style={{ background: "#FFF8E1", border: "1px solid #F5E6D3", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: isPinned ? "#D97706" : "#F9A825", display: "flex", alignItems: "center", flexShrink: 0 }} title="ส่งเข้า LINE">
                <Send size={15} />
              </button>
            )}
            <ChevronRight size={16} color={isPinned ? "#D97706" : "#D7CCC8"} onClick={() => (window.location.href = `/announcements/${ann.id}`)} style={{ cursor: "pointer" }} />
          </div>
        </div>
        {ann.content && (
          <div onClick={() => (window.location.href = `/announcements/${ann.id}`)}
            style={{ margin: "0 0 8px", cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            <MarkdownRenderer content={ann.content} isPreview={true} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isPinned ? "#B45309" : "#A1887F" }}>
          <CalendarDays size={11} /> {timeAgo(ann.created_at)}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FFF9F0", paddingBottom: bottomNavOffset(canManageClass ? 72 : 0) }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 8px", textAlign: "center" }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: 0 }}>ประกาศ</h1>
        <span style={{ color: "#A1887F", fontSize: 13, marginTop: 4, display: "block" }}>{items.length} รายการ</span>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#A1887F" }}>กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#A1887F", background: "#fff", borderRadius: 14, border: "1px solid #F5E6D3" }}>
            <Megaphone size={40} color="#FFE082" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: "#795548" }}>ยังไม่มีประกาศ</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {canManageClass ? "กดปุ่มด้านล่างเพื่อสร้างประกาศใหม่" : "รอครูประกาศข่าวสาร"}
            </div>
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
                    <FileEdit size={14} color="#F9A825" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F9A825" }}>แจ้งเพื่อทราบ</span>
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
      {canManageClass && (
      <div style={{ position: "fixed", bottom: bottomNavOffset(), left: 0, right: 0, padding: "12px 20px", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #F5E6D3", zIndex: 100 }}>
        <button onClick={() => (window.location.href = "/announcements/create")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#FFC107", color: "#3E2723", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
          <Plus size={18} /> สร้างประกาศ
        </button>
      </div>
      )}

      <BottomNav />

      {/* Send Modal */}
      {showSend && sendAnn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => setShowSend(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#A1887F" }}><X size={20} /></button>

            {sendStep === "choose" ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 4, textAlign: "center" }}>
                  ส่งประกาศ: {sendAnn.title}
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
