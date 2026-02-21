"use client";

import { useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, Megaphone, AlignLeft, CalendarDays, Link2, Paperclip, FileEdit, AlertCircle, Check, Clock3, X, Users, MessageSquare, ChevronRight, Send } from "lucide-react";

type Group = { id: string; line_group_id: string; group_name: string };

export default function CreateAnnouncementPage() {
  const { isReady, liffError, userId } = useLiff();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [linkUrl, setLinkUrl] = useState("");
  const [annType, setAnnType] = useState<"info" | "action">("info");
  const [loading, setLoading] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [popupStep, setPopupStep] = useState<"main" | "groups">("main");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedAnn, setSavedAnn] = useState<any>(null);

  const MAX_CONTENT = 1000;

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try { const res = await fetch("/api/groups"); const data = await res.json(); setGroups(data.groups || []); }
    catch { setGroups([]); } finally { setLoadingGroups(false); }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert("กรุณากรอกหัวข้อประกาศ"); return; }
    setLoading(true);
    try {
      if (!userId) throw new Error("User ID not found");
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId).single();
      if (!userData) throw new Error("ไม่สามารถยืนยันผู้ใช้ได้");

      const dateVal = eventDate ? new Date(`${eventDate}T${eventTime}:00`).toISOString() : null;
      const { data, error } = await supabase.from("announcements").insert({
        created_by: userData.id, title, content, pinned: annType === "action",
      }).select("id").single();
      if (error) throw error;

      setSavedAnn({ id: data?.id, title, content, type: annType, event_date: dateVal });
      setShowPopup(true); setPopupStep("main");
    } catch (err: any) { console.error(err); alert(err.message || "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  };

  const sendToTarget = async (targetId: string) => {
    if (!savedAnn) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-announcement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, announcement: savedAnn }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      alert("ส่งสำเร็จ!");
      resetForm(); window.location.href = "/announcements";
    } catch (err: any) { alert("ส่งไม่สำเร็จ: " + (err.message || "")); }
    finally { setSending(false); }
  };

  const resetForm = () => { setShowPopup(false); setTitle(""); setContent(""); setEventDate(""); setEventTime("09:00"); setLinkUrl(""); setSavedAnn(null); };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 15, background: "#fff", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/announcements")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>สร้างประกาศ</h1>
      </div>

      {/* Image Upload */}
      <div style={{ margin: "16px 16px 0", borderRadius: 14, background: "#DBEAFE", padding: "28px 20px", textAlign: "center", border: "1px dashed #93C5FD" }}>
        <Upload size={36} color="#3B82F6" style={{ marginBottom: 10 }} />
        <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 50, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Upload size={14} /> อัปโหลดภาพ
        </button>
      </div>

      {/* Form */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>ข้อมูลประกาศ</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Megaphone size={14} /> <span style={{ color: "#E53935" }}>*</span> หัวข้อประกาศ</label>
          <input type="text" placeholder="เช่น มาแต่งตัวเป็นนักบินอวกาศกัน" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}><AlignLeft size={14} /> รายละเอียดประกาศ</label>
            <span style={{ fontSize: 12, color: "#CBD5E1" }}>{content.length}/{MAX_CONTENT}</span>
          </div>
          <textarea placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับประกาศ..." value={content}
            onChange={(e) => { if (e.target.value.length <= MAX_CONTENT) setContent(e.target.value); }}
            rows={5} style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><CalendarDays size={14} /> <span style={{ color: "#E53935" }}>*</span> วันถึงกำหนด</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap" }}>เวลา</span>
              <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Link2 size={14} /> ลิงก์แนบ <span style={{ fontWeight: 400, color: "#94A3B8" }}>(เช่น เว็บไซต์อ้างอิง)</span></label>
          <input type="url" placeholder="ใส่ได้เฉพาะลิงก์ URL ครับ" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Paperclip size={14} /> เอกสารแนบ</label>
          <div style={{ border: "1px dashed #CBD5E1", borderRadius: 12, padding: "24px 20px", textAlign: "center", background: "#FAFBFC" }}>
            <Upload size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>อัปโหลดไฟล์</div>
            <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 2 }}>(สูงสุด 4 ไฟล์ ไฟล์ละไม่เกิน 50MB)</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><span style={{ color: "#E53935" }}>*</span> ประเภทของประกาศ</label>
          <div style={{ display: "flex", gap: 20 }}>
            {[{ val: "info" as const, icon: <FileEdit size={14} />, label: "แจ้งเพื่อทราบ" },
              { val: "action" as const, icon: <AlertCircle size={14} />, label: "แจ้งเพื่อดำเนินการ" }].map((opt) => (
              <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#1E293B" }}>
                <div onClick={() => setAnnType(opt.val)} style={{ width: 20, height: 20, borderRadius: "50%", border: annType === opt.val ? "none" : "2px solid #CBD5E1", background: annType === opt.val ? "#2563EB" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {annType === opt.val && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                {opt.icon} {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={handleSubmit} disabled={loading}
          style={{ display: "block", width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: loading ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "กำลังบันทึก..." : "ถัดไป"}
        </button>
      </div>

      {/* Popup */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => { resetForm(); window.location.href = "/announcements"; }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>

            {popupStep === "main" ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#DBEAFE", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={32} color="#2563EB" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>บันทึกเรียบร้อย!</h3>
                  <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, margin: 0 }}>บอทจะส่งข้อความเข้าแชทให้</p>
                </div>
                <button onClick={() => userId && sendToTarget(userId)} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} /> {sending ? "กำลังส่ง..." : "ส่งเข้าแชทตัวเอง"}
                </button>
                <button onClick={() => { setPopupStep("groups"); fetchGroups(); }} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#fff", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Users size={18} color="#2563EB" /> ส่งเข้าแชทกลุ่ม</span>
                  <ChevronRight size={16} color="#94A3B8" />
                </button>
                <button onClick={() => { resetForm(); window.location.href = "/announcements"; }}
                  style={{ width: "100%", padding: "12px 16px", background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock3 size={18} /> ประกาศภายหลัง
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setPopupStep("main")} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, padding: 0, fontSize: 13 }}><ArrowLeft size={16} /> กลับ</button>
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
