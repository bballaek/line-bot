"use client";

import { useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";

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

  if (liffError) return <div style={{ padding: 16, color: "red" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center" }}>Loading...</div>;

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
        .from("users")
        .select("id")
        .eq("line_user_id", userId)
        .single();

      if (userError || !userData) throw new Error("ไม่สามารถยืนยันผู้ใช้ได้");

      const dueDatetime = dueDate
        ? new Date(`${dueDate}T${dueTime}:00`).toISOString()
        : null;

      const { error } = await supabase.from("homeworks").insert({
        created_by: userData.id,
        subject,
        title,
        description,
        due_date: dueDatetime,
      });

      if (error) throw error;

      setSuccessMessage("บันทึกการบ้านเรียบร้อยแล้ว!");
      setSubject("");
      setTitle("");
      setDescription("");
      setDueDate("");
      setDueTime("18:00");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/homework-list";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFDF5",
        fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Fixed Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
          background: "rgba(255,253,245,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #f0e8d0",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "none",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
            padding: "4px 8px",
            color: "#333",
          }}
        >
          ←
        </button>
        <h1
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "17px",
            fontWeight: 700,
            color: "#333",
            margin: 0,
            paddingRight: "36px",
          }}
        >
          สร้างการบ้าน
        </h1>
      </div>

      {/* Banner Image Area */}
      <div
        style={{
          margin: "16px 16px 0",
          borderRadius: "16px",
          overflow: "hidden",
          background: "linear-gradient(135deg, #FFF8E1 0%, #FFE0B2 100%)",
          padding: "28px 20px",
          textAlign: "center",
          border: "1px dashed #FFB300",
          position: "relative",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>📝✏️📚</div>
        <button
          style={{
            background: "linear-gradient(135deg, #FFB300 0%, #FFA000 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            padding: "8px 20px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255,160,0,0.3)",
          }}
        >
          📎 อัปโหลดภาพ
        </button>
      </div>

      {/* Form */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: "100px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#333",
            marginBottom: "16px",
          }}
        >
          ข้อมูลการบ้าน
        </h2>

        {successMessage && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "#E8F5E9",
              color: "#2E7D32",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* Subject */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#555",
              marginBottom: "6px",
            }}
          >
            <span style={{ color: "#E53935" }}>*</span> ชื่อวิชา
          </label>
          <input
            type="text"
            placeholder="เช่น ศิลปะ, คณิตศาสตร์"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e0d8c0",
              borderRadius: "12px",
              fontSize: "15px",
              background: "#fff",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Title */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#555",
              marginBottom: "6px",
            }}
          >
            <span style={{ color: "#E53935" }}>*</span> ชื่อการบ้าน
          </label>
          <input
            type="text"
            placeholder="🎨 ระบายสีน้ำให้สัตว์โลกแสนน่ารัก 🐱"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e0d8c0",
              borderRadius: "12px",
              fontSize: "15px",
              background: "#fff",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#555" }}>
              รายละเอียดการบ้าน
            </label>
            <span style={{ fontSize: "12px", color: "#bbb" }}>
              {description.length}/{MAX_DESC}
            </span>
          </div>
          <textarea
            placeholder="วันนี้ครูฝากไหม 🌷 มีงานศิลปะแสนสนุก อยากมาชวนน้องๆ ห้อง ป.1/2 ทำด้วยกันนะค้า 🎨"
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= MAX_DESC) setDescription(e.target.value);
            }}
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e0d8c0",
              borderRadius: "12px",
              fontSize: "14px",
              background: "#fff",
              outline: "none",
              resize: "none",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#555",
              marginBottom: "6px",
            }}
          >
            📅 กำหนดส่ง
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "1px solid #e0d8c0",
                borderRadius: "12px",
                fontSize: "15px",
                background: "#fff",
                outline: "none",
              }}
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              style={{
                width: "120px",
                padding: "12px 14px",
                border: "1px solid #e0d8c0",
                borderRadius: "12px",
                fontSize: "15px",
                background: "#fff",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Fixed Footer Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(255,253,245,0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #f0e8d0",
          zIndex: 100,
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "400px",
            margin: "0 auto",
            padding: "14px",
            background: loading
              ? "#ccc"
              : "linear-gradient(135deg, #FFB300 0%, #FFA000 100%)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            border: "none",
            borderRadius: "50px",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 12px rgba(255,160,0,0.35)",
            letterSpacing: "0.5px",
          }}
        >
          {loading ? "กำลังบันทึก..." : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
