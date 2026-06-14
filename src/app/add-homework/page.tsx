"use client";

import React, { useState, useRef } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, BookOpen, FileText, AlignLeft, CalendarDays, Link2, Paperclip, Users, User, Check, Clock3, X, Send, MessageSquare, ChevronRight, Bold, Italic, Heading, List, Eye, Edit2, Trash2 } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TeacherOnlyGate from "@/components/TeacherOnlyGate";

type Group = { id: string; line_group_id: string; group_name: string };

export default function AddHomeworkPage() {
  const { isReady, liffError, userId } = useLiff();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("00:00");
  const [linkUrl, setLinkUrl] = useState("");
  const [hwType, setHwType] = useState<"single" | "group">("single");
  const [targetGroup, setTargetGroup] = useState<"All" | "Group A" | "Group B">("All");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<{name: string; url: string; size: number}[]>([]);
  const [uploading, setUploading] = useState(false);

  const insertFormat = (format: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    let newText = "";
    let newCursorPos = start;
    if (format === 'bold') {
      newText = `**${selectedText || 'ข้อความ'}**`;
      newCursorPos = start + 2 + (selectedText ? selectedText.length : 0);
    } else if (format === 'italic') {
      newText = `_${selectedText || 'ข้อความ'}_`;
      newCursorPos = start + 1 + (selectedText ? selectedText.length : 0);
    } else if (format === 'heading') {
      newText = `\n# ${selectedText || 'หัวข้อ'}`;
      newCursorPos = start + 3 + (selectedText ? selectedText.length : 0);
    } else if (format === 'list') {
      newText = `\n- ${selectedText || 'รายการ'}`;
      newCursorPos = start + 3 + (selectedText ? selectedText.length : 0);
    } else if (format === 'link') {
      newText = `[${selectedText || 'ข้อความ'}](url)`;
      newCursorPos = start + 1 + (selectedText ? selectedText.length : 0);
    }
    const newContent = description.substring(0, start) + newText + description.substring(end);
    if (newContent.length <= MAX_DESC) {
      setDescription(newContent);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursorPos, newCursorPos); }, 0);
    }
  };

  const [showPopup, setShowPopup] = useState(false);
  const [popupStep, setPopupStep] = useState<"main" | "groups">("main");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedHw, setSavedHw] = useState<any>(null);

  const MAX_DESC = 1000;

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try { const res = await fetch("/api/groups"); const data = await res.json(); setGroups(data.groups || []); }
    catch { setGroups([]); } finally { setLoadingGroups(false); }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !title.trim()) { alert("กรุณากรอกชื่อวิชาและชื่อการบ้าน"); return; }
    setLoading(true);
    try {
      if (!userId) throw new Error("User ID not found");
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId).single();
      if (!userData) throw new Error("ไม่สามารถยืนยันผู้ใช้ได้");

      const dueDatetime = dueDate ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null;
      const { data, error } = await supabase.from("homeworks").insert({
        created_by: userData.id, subject, title, description, due_date: dueDatetime, target_group: targetGroup
      }).select("id").single();
      if (error) throw error;

      setSavedHw({ id: data?.id, title, subject, description, due_date: dueDatetime, target_group: targetGroup });
      setShowPopup(true); setPopupStep("main");
    } catch (err: any) { console.error(err); alert(err.message || "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  };

  const sendToTarget = async (targetId: string) => {
    if (!savedHw) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-homework", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, homework: savedHw }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      alert("ส่งสำเร็จ!");
      resetForm(); window.location.href = "/homework-list";
    } catch (err: any) { alert("ส่งไม่สำเร็จ: " + (err.message || "")); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (attachedFiles.length + files.length > 4) { alert('สูงสุด 4 ไฟล์เท่านั้น'); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) { alert(`ไฟล์ ${file.name} ขนาดใหญ่เกินไป (สูงสุด 50MB)`); continue; }
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('homework-files').upload(fileName, file, { contentType: file.type });
        if (uploadError) { alert('อัปโหลดไม่สำเร็จ: ' + uploadError.message); continue; }
        const { data: urlData } = supabase.storage.from('homework-files').getPublicUrl(fileName);
        setAttachedFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl, size: file.size }]);
      }
    } catch (err: any) { alert('อัปโหลดไม่สำเร็จ: ' + (err.message || '')); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const removeFile = (index: number) => { setAttachedFiles(prev => prev.filter((_, i) => i !== index)); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const resetForm = () => { setShowPopup(false); setSubject(""); setTitle(""); setDescription(""); setDueDate(""); setDueTime("00:00"); setLinkUrl(""); setTargetGroup("All"); setSavedHw(null); setAttachedFiles([]); };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #F5E6D3", borderRadius: 10, fontSize: 15, background: "#fff", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#5D4037", marginBottom: 6 };

  return (
    <TeacherOnlyGate title="สร้างการบ้าน" backHref="/homework-list" featureLabel="การบ้าน">
    <div style={{ minHeight: "100vh", background: "#FFF9F0", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #F5E6D3" }}>
        <button onClick={() => (window.location.href = "/homework-list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#5D4037", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#3E2723", margin: 0, paddingRight: 36 }}>สร้างการบ้าน</h1>
      </div>

      {/* Form */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}><AlignLeft size={14} /> รายละเอียดการบ้าน</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!showPreview && (
                <div style={{ display: "flex", gap: 4, background: "#FFF9F0", padding: "2px", borderRadius: 6 }}>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('bold');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ตัวหนา"><Bold size={14} color="#5D4037" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('italic');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ตัวเอียง"><Italic size={14} color="#5D4037" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('heading');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="หัวข้อ"><Heading size={14} color="#5D4037" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('list');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="รายการ"><List size={14} color="#5D4037" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('link');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ลิงก์"><Link2 size={14} color="#5D4037" /></button>
                </div>
              )}
              <button
                onClick={(e) => {e.preventDefault(); setShowPreview(!showPreview);}}
                style={{ background: "#F5E6D3", border: "none", padding: "4px 8px", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#5D4037" }}>
                {showPreview ? <><Edit2 size={12} /> แก้ไข</> : <><Eye size={12} /> ดูตัวอย่าง</>}
              </button>
            </div>
          </div>
          {showPreview ? (
            <div style={{ ...inputStyle, minHeight: 120, border: "1px solid #F5E6D3", background: "#FFFBF5" }}>
              {description ? <MarkdownRenderer content={description} /> : <span style={{ color: "#A1887F", fontSize: 14 }}>ยังไม่มีข้อความ...</span>}
            </div>
          ) : (
            <>
              <textarea ref={textAreaRef} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการบ้านชิ้นนี้..." value={description}
                onChange={(e) => { if (e.target.value.length <= MAX_DESC) setDescription(e.target.value); }}
                rows={5} style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontSize: 14 }} />
              <div style={{ textAlign: "right", marginTop: 4, fontSize: 12, color: "#A1887F" }}>
                รองรับ <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" style={{ color: "#FFC107", textDecoration: "none" }}>Markdown</a> ({description.length}/{MAX_DESC})
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><BookOpen size={14} /> <span style={{ color: "#E53935" }}>*</span> ชื่อวิชา</label>
          <input type="text" placeholder="เช่น ศิลปะ, คณิตศาสตร์" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><FileText size={14} /> <span style={{ color: "#E53935" }}>*</span> ชื่อการบ้าน</label>
          <input type="text" placeholder="ระบายสีน้ำให้สัตว์โลกแสนน่ารัก" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><CalendarDays size={14} /> <span style={{ color: "#E53935" }}>*</span> วันกำหนดส่ง</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#A1887F", whiteSpace: "nowrap" }}>เวลา</span>
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Link2 size={14} /> ลิงก์แนบ <span style={{ fontWeight: 400, color: "#A1887F" }}>(ถ้ามี)</span></label>
          <input type="url" placeholder="ใส่ได้เฉพาะลิงก์ URL ครับ" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Paperclip size={14} /> เอกสารแนบ</label>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: 'none' }} />
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {attachedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FFFBF5', border: '1px solid #F5E6D3', borderRadius: 8 }}>
                  <FileText size={16} color="#FFC107" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#3E2723', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#A1887F' }}>{formatFileSize(f.size)}</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14} color="#E53935" /></button>
                </div>
              ))}
            </div>
          )}
          {attachedFiles.length < 4 && (
            <div onClick={() => !uploading && fileInputRef.current?.click()} style={{ border: '1px dashed #D7CCC8', borderRadius: 12, padding: '24px 20px', textAlign: 'center', background: '#FFFBF5', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <Upload size={24} color="#A1887F" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 13, color: '#795548', fontWeight: 500 }}>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}</div>
              <div style={{ fontSize: 11, color: '#D7CCC8', marginTop: 2 }}>(สูงสุด 4 ไฟล์ ไฟล์ละไม่เกิน 50MB)</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><Users size={14} /> <span style={{ color: "#E53935" }}>*</span> กลุ่มเป้าหมาย</label>
          <div style={{ display: "flex", gap: 16 }}>
            {["All", "Group A", "Group B"].map((grp) => (
              <label key={grp} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#3E2723" }}>
                <div onClick={() => setTargetGroup(grp as any)} style={{ width: 20, height: 20, borderRadius: "50%", border: targetGroup === grp ? "none" : "2px solid #D7CCC8", background: targetGroup === grp ? "#FFC107" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {targetGroup === grp && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                {grp === "All" ? "ทั้งหมด" : grp}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}><span style={{ color: "#E53935" }}>*</span> ประเภทการบ้าน</label>
          <div style={{ display: "flex", gap: 24 }}>
            {[{ val: "single" as const, icon: <User size={14} />, label: "การบ้านเดี่ยว" },
              { val: "group" as const, icon: <Users size={14} />, label: "การบ้านกลุ่ม" }].map((opt) => (
              <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#3E2723" }}>
                <div onClick={() => setHwType(opt.val)} style={{ width: 20, height: 20, borderRadius: "50%", border: hwType === opt.val ? "none" : "2px solid #D7CCC8", background: hwType === opt.val ? "#FFC107" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {hwType === opt.val && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                {opt.icon} {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(255,249,240,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #F5E6D3", zIndex: 100 }}>
        <button onClick={handleSubmit} disabled={loading}
          style={{ display: "block", width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: loading ? "#A1887F" : "#FFC107", color: "#3E2723", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "กำลังบันทึก..." : "ถัดไป"}
        </button>
      </div>

      {/* Popup */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 360, width: "100%", position: "relative" }}>
            <button onClick={() => { resetForm(); window.location.href = "/homework-list"; }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#A1887F" }}><X size={20} /></button>

            {popupStep === "main" ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#FFF8E1", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={32} color="#FFC107" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", marginBottom: 4 }}>บันทึกเรียบร้อย!</h3>
                  <p style={{ fontSize: 13, color: "#A1887F", lineHeight: 1.6, margin: 0 }}>บอทจะส่งข้อความเข้าแชทให้</p>
                </div>
                <button onClick={() => userId && sendToTarget(userId)} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#FFC107", color: "#3E2723", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} /> {sending ? "กำลังส่ง..." : "ส่งเข้าแชทตัวเอง"}
                </button>
                <button onClick={() => { setPopupStep("groups"); fetchGroups(); }} disabled={sending}
                  style={{ width: "100%", padding: "12px 16px", background: "#fff", color: "#3E2723", border: "1px solid #F5E6D3", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Users size={18} color="#FFC107" /> ส่งเข้าแชทกลุ่ม</span>
                  <ChevronRight size={16} color="#A1887F" />
                </button>
                <button onClick={() => { resetForm(); window.location.href = "/homework-list"; }}
                  style={{ width: "100%", padding: "12px 16px", background: "#FFFBF5", color: "#795548", border: "1px solid #F5E6D3", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock3 size={18} /> บันทึกไว้ก่อน
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setPopupStep("main")} style={{ background: "none", border: "none", cursor: "pointer", color: "#5D4037", display: "flex", alignItems: "center", gap: 4, marginBottom: 12, padding: 0, fontSize: 13 }}><ArrowLeft size={16} /> กลับ</button>
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
    </TeacherOnlyGate>
  );
}
