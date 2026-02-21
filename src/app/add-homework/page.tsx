"use client";

import { useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, BookOpen, FileText, AlignLeft, CalendarDays, Link2, Paperclip, Users, User, Check, Send, Hash, X } from "lucide-react";

export default function AddHomeworkPage() {
  const { isReady, liffError, userId } = useLiff();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("00:00");
  const [linkUrl, setLinkUrl] = useState("");
  const [hwType, setHwType] = useState<"single" | "group">("single");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [savedHomeworkId, setSavedHomeworkId] = useState<string | null>(null);

  const MAX_DESC = 1000;

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  const handleSubmit = async () => {
    if (!subject.trim() || !title.trim()) {
      alert("กรุณากรอกชื่อวิชาและชื่อการบ้าน");
      return;
    }
    setLoading(true);
    try {
      if (!userId) throw new Error("User ID not found");
      const { data: userData } = await supabase
        .from("users").select("id").eq("line_user_id", userId).single();
      if (!userData) throw new Error("ไม่สามารถยืนยันผู้ใช้ได้");

      const dueDatetime = dueDate ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null;
      const { data, error } = await supabase.from("homeworks").insert({
        created_by: userData.id, subject, title, description, due_date: dueDatetime,
      }).select("id").single();
      if (error) throw error;

      setSavedHomeworkId(data?.id || null);
      setShowPopup(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally { setLoading(false); }
  };

  const handleSendNow = () => {
    setShowPopup(false);
    setSubject(""); setTitle(""); setDescription(""); setDueDate(""); setDueTime("00:00"); setLinkUrl("");
    alert("ส่งเข้าแชทเรียบร้อยแล้ว!");
    window.location.href = "/homework-list";
  };

  const handleCreateHash = () => {
    setShowPopup(false);
    setSubject(""); setTitle(""); setDescription(""); setDueDate(""); setDueTime("00:00"); setLinkUrl("");
    alert("สร้าง # เรียบร้อยแล้ว!");
    window.location.href = "/homework-list";
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 15, background: "#fff", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/homework-list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>สร้างการบ้าน</h1>
      </div>

      {/* Form */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>

        {/* Description (top, large) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              <AlignLeft size={14} /> รายละเอียดการบ้าน
            </label>
            <span style={{ fontSize: 12, color: "#CBD5E1" }}>{description.length}/{MAX_DESC}</span>
          </div>
          <textarea
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการบ้านชิ้นนี้..."
            value={description}
            onChange={(e) => { if (e.target.value.length <= MAX_DESC) setDescription(e.target.value); }}
            rows={5}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontSize: 14 }}
          />
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <BookOpen size={14} /> <span style={{ color: "#E53935" }}>*</span> ชื่อวิชา
          </label>
          <input type="text" placeholder="เช่น ศิลปะ, คณิตศาสตร์" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <FileText size={14} /> <span style={{ color: "#E53935" }}>*</span> ชื่อการบ้าน
          </label>
          <input type="text" placeholder="ระบายสีน้ำให้สัตว์โลกแสนน่ารัก" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        {/* Due Date + Time */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <CalendarDays size={14} /> <span style={{ color: "#E53935" }}>*</span> วันกำหนดส่ง
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap" }}>เวลา</span>
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </div>
          </div>
        </div>

        {/* Link URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <Link2 size={14} /> ลิงก์แนบ <span style={{ fontWeight: 400, color: "#94A3B8" }}>(เช่น เว็บไซต์ที่เกี่ยวข้อง)</span>
          </label>
          <input type="url" placeholder="ใส่ได้เฉพาะลิงก์ URL ครับ" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={inputStyle} />
        </div>

        {/* File Upload Area */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <Paperclip size={14} /> เอกสารแนบ <span style={{ fontWeight: 400, color: "#94A3B8" }}>(เช่น รูปถ่าย, ไฟล์งาน, เอกสารประกอบ เป็นต้น)</span>
          </label>
          <div style={{ border: "1px dashed #CBD5E1", borderRadius: 12, padding: "24px 20px", textAlign: "center", background: "#FAFBFC" }}>
            <Upload size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>อัปโหลดไฟล์</div>
            <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 2 }}>(สูงสุด 4 ไฟล์ ไฟล์ละไม่เกิน 50MB)</div>
          </div>
        </div>

        {/* Homework Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <span style={{ color: "#E53935" }}>*</span> ประเภทการบ้าน
          </label>
          <div style={{ display: "flex", gap: 24 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#1E293B" }}>
              <div
                onClick={() => setHwType("single")}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: hwType === "single" ? "none" : "2px solid #CBD5E1",
                  background: hwType === "single" ? "#2563EB" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {hwType === "single" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <User size={14} /> การบ้านเดี่ยว
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#1E293B" }}>
              <div
                onClick={() => setHwType("group")}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: hwType === "group" ? "none" : "2px solid #CBD5E1",
                  background: hwType === "group" ? "#2563EB" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {hwType === "group" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <Users size={14} /> การบ้านกลุ่ม
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={handleSubmit} disabled={loading}
          style={{ display: "block", width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: loading ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "กำลังบันทึก..." : "ถัดไป"}
        </button>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center", position: "relative" }}>
            <button onClick={() => setShowPopup(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
              <X size={20} />
            </button>

            {/* Character icon placeholder */}
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#DBEAFE", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={36} color="#2563EB" />
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>แจ้งประกาศแบบไหนดีครับ?</h3>
            <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20, lineHeight: 1.6 }}>
              คุณครูสามารถสร้าง # เก็บไว้เพื่อส่งในกลุ่มภายหลังได้ โดยน้องมานะจะส่งประกาศที่คุณครูสร้างไว้เข้าแยกให้ครับ
            </p>

            <button onClick={handleSendNow}
              style={{ width: "100%", padding: "12px 0", background: "#2563EB", color: "#fff", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Send size={16} /> ส่งเข้าแชททันที
            </button>

            <button onClick={handleCreateHash}
              style={{ width: "100%", padding: "12px 0", background: "#fff", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Hash size={16} /> สร้าง # เพื่อแจ้งประกาศภายหลัง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
