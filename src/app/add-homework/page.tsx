"use client";

import { useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, BookOpen, FileText, AlignLeft, CalendarDays, Clock, Check } from "lucide-react";

export default function AddHomeworkPage() {
  const { isReady, liffError, userId } = useLiff();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const MAX_DESC = 1000;

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  const handleSubmit = async () => {
    if (!subject.trim() || !title.trim()) {
      alert("กรุณากรอกชื่อวิชาและชื่อการบ้าน");
      return;
    }
    setLoading(true);
    setSuccessMessage("");
    try {
      if (!userId) throw new Error("User ID not found");
      const { data: userData, error: userError } = await supabase
        .from("users").select("id").eq("line_user_id", userId).single();
      if (userError || !userData) throw new Error("ไม่สามารถยืนยันผู้ใช้ได้");

      const dueDatetime = dueDate ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null;
      const { error } = await supabase.from("homeworks").insert({
        created_by: userData.id, subject, title, description, due_date: dueDatetime,
      });
      if (error) throw error;
      setSuccessMessage("บันทึกการบ้านเรียบร้อยแล้ว!");
      setSubject(""); setTitle(""); setDescription(""); setDueDate(""); setDueTime("18:00");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 15, background: "#fff", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", fontFamily: "'Inter','Noto Sans Thai',sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Fixed Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/homework-list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>สร้างการบ้าน</h1>
      </div>

      {/* Upload Area */}
      <div style={{ margin: "16px 16px 0", borderRadius: 14, background: "#DBEAFE", padding: "28px 20px", textAlign: "center", border: "1px dashed #93C5FD" }}>
        <Upload size={36} color="#3B82F6" style={{ marginBottom: 10 }} />
        <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 50, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Upload size={14} /> อัปโหลดภาพ
        </button>
      </div>

      {/* Form */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>ข้อมูลการบ้าน</h2>

        {successMessage && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#DBEAFE", color: "#1D4ED8", borderRadius: 10, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={16} /> {successMessage}
          </div>
        )}

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

        {/* Description */}
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
            rows={4}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontSize: 14 }}
          />
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <CalendarDays size={14} /> กำหนดส่ง
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <div style={{ position: "relative" }}>
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ ...inputStyle, width: 120 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ display: "block", width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: loading ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "กำลังบันทึก..." : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
