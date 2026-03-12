"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, BookOpen, CalendarDays, Clock, Users, CheckCircle2, User, Send, Edit2, Bold, Italic, Heading, List, Link2, X } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type Homework = {
  id: string; subject: string; title: string; description: string;
  target_group?: string; created_by?: string;
  due_date: string | null; created_at: string;
};
type ReadUser = { display_name: string; picture_url: string | null; read_at: string };

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function formatDateFull(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

export default function HomeworkDetailPage() {
  const params = useParams();
  const hwId = params.id as string;
  const { isReady, liffError, userId } = useLiff();

  const [hw, setHw] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Status view
  const [showStatus, setShowStatus] = useState(false);
  const [readUsers, setReadUsers] = useState<ReadUser[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Edit Description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionContent, setEditDescriptionContent] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_DESC = 1000;

  useEffect(() => { if (isReady && userId && hwId) loadData(); }, [isReady, userId, hwId]);

  const insertFormat = (format: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editDescriptionContent.substring(start, end);
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
    const newContent = editDescriptionContent.substring(0, start) + newText + editDescriptionContent.substring(end);
    if (newContent.length <= MAX_DESC) {
      setEditDescriptionContent(newContent);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursorPos, newCursorPos); }, 0);
    }
  };

  const handleSaveDescription = async () => {
    setSavingDesc(true);
    try {
      const { error } = await supabase.from("homeworks").update({ description: editDescriptionContent }).eq("id", hwId);
      if (error) throw error;
      setHw((prev) => prev ? { ...prev, description: editDescriptionContent } : prev);
      setIsEditingDescription(false);
    } catch (err: any) {
      alert("บันทึกไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setSavingDesc(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      setDbUserId(userData.id);

      const { data: hwData } = await supabase.from("homeworks").select("*").eq("id", hwId).single();
      if (!hwData) return;
      setHw(hwData);
      setIsCreator(hwData.created_by === userData.id);

      // Check if already marked as done
      const { data: readData } = await supabase.from("user_homeworks")
        .select("id").eq("homework_id", hwId).eq("user_id", userData.id).eq("status", "done").single();
      setHasRead(!!readData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAcknowledge = async () => {
    if (!dbUserId || hasRead) return;
    setAcknowledging(true);
    try {
      await supabase.from("user_homeworks").upsert(
        { homework_id: hwId, user_id: dbUserId, status: "done" },
        { onConflict: "user_id,homework_id" }
      );
      setHasRead(true);
    } catch (e: any) { console.error(e); alert("เกิดข้อผิดพลาด"); }
    finally { setAcknowledging(false); }
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data } = await supabase.from("user_homeworks")
        .select("updated_at, user_id, users ( display_name, picture_url )")
        .eq("homework_id", hwId)
        .eq("status", "done")
        .order("updated_at", { ascending: true });

      const reads: ReadUser[] = (data || []).map((r: any) => ({
        display_name: r.users?.display_name || "ไม่ทราบชื่อ",
        picture_url: r.users?.picture_url || null,
        read_at: r.updated_at,
      }));
      setReadUsers(reads);
    } catch (e) { console.error(e); }
    finally { setLoadingStatus(false); }
  };

  const openStatus = () => { setShowStatus(true); loadStatus(); };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || loading) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;
  if (!hw) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>ไม่พบการบ้าน</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/homework-list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>รายละเอียดการบ้าน</h1>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        {/* Title card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "20px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} color="#495ca4" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", margin: 0, flex: 1, lineHeight: 1.4 }}>{hw.title}</h2>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", borderRadius: 8, padding: "5px 12px" }}>
              <BookOpen size={13} color="#3B82F6" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>{hw.subject}</span>
            </div>
            {hw.target_group && hw.target_group !== "All" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FEF2F2", borderRadius: 8, padding: "5px 12px" }}>
                <Users size={13} color="#E11D48" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E11D48" }}>{hw.target_group}</span>
              </div>
            )}
          </div>

          {/* Due date */}
          {hw.due_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, background: "#FFF3E0", padding: "8px 12px", borderRadius: 8 }}>
              <CalendarDays size={13} color="#E65100" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#E65100" }}>กำหนดส่ง: {formatDateFull(hw.due_date)}</span>
            </div>
          )}

          {/* Created date */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Clock size={13} color="#94A3B8" />
            <span style={{ fontSize: 12, color: "#94A3B8" }}>สร้างเมื่อ: {formatDateFull(hw.created_at)}</span>
          </div>

          {/* Description body */}
          {isEditingDescription ? (
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 4, background: "#fff", padding: "2px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('bold');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ตัวหนา"><Bold size={14} color="#475569" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('italic');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ตัวเอียง"><Italic size={14} color="#475569" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('heading');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="หัวข้อ"><Heading size={14} color="#475569" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('list');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="รายการ"><List size={14} color="#475569" /></button>
                  <button onClick={(e) => {e.preventDefault(); insertFormat('link');}} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 4 }} title="ลิงก์"><Link2 size={14} color="#475569" /></button>
                </div>
                <button onClick={() => setIsEditingDescription(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={16} /></button>
              </div>
              <textarea 
                ref={textAreaRef} 
                value={editDescriptionContent}
                onChange={(e) => { if (e.target.value.length <= MAX_DESC) setEditDescriptionContent(e.target.value); }}
                rows={5} 
                style={{ width: "100%", padding: "10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} 
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  รองรับ <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>Markdown</a> ({editDescriptionContent.length}/{MAX_DESC})
                </div>
                <button 
                  onClick={handleSaveDescription} 
                  disabled={savingDesc}
                  style={{ background: "#495ca4", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: savingDesc ? "not-allowed" : "pointer" }}>
                  {savingDesc ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", background: "#F8FAFC", padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 16 }}>
              {isCreator && (
                <button 
                  onClick={() => { setEditDescriptionContent(hw.description || ""); setIsEditingDescription(true); }}
                  style={{ position: "absolute", top: 12, right: 12, background: "#fff", border: "1px solid #E2E8F0", padding: "4px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}>
                  <Edit2 size={12} /> แก้ไข
                </button>
              )}
              {hw.description ? (
                <div style={isCreator ? { marginTop: 12 } : {}}>
                  <MarkdownRenderer content={hw.description} />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: 14 }}>ไม่มีรายละเอียดเพิ่มเติม</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Creator: Status button */}
        {isCreator && (
          <button onClick={openStatus}
            style={{ width: "100%", padding: "14px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "#1E293B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={18} color="#495ca4" /> สถานะการอ่าน
            </span>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>ดูรายชื่อ →</span>
          </button>
        )}
      </div>

      {/* Footer: Acknowledge button */}
      {!isCreator && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
          {hasRead ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#F0FDF4", color: "#16A34A", fontSize: 15, fontWeight: 700, borderRadius: 50, border: "1px solid #BBF7D0" }}>
              <CheckCircle2 size={20} /> อ่านแล้ว
            </div>
          ) : (
            <button onClick={handleAcknowledge} disabled={acknowledging}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: acknowledging ? "#94A3B8" : "#495ca4", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: acknowledging ? "not-allowed" : "pointer" }}>
              {acknowledging ? "กำลังบันทึก..." : "ฉันอ่านและรับทราบแล้ว"}
            </button>
          )}
        </div>
      )}

      {/* Status Modal */}
      {showStatus && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", marginTop: 60, borderRadius: "20px 20px 0 0", overflow: "hidden" }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <button onClick={() => setShowStatus(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center" }}>
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 28 }}>
                {hw.title}
              </h3>
            </div>

            {/* Tab header */}
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "14px 0", fontWeight: 700, fontSize: 14, color: "#1E293B", borderBottom: "3px solid #495ca4" }}>
                อ่านแล้ว ({readUsers.length})
              </div>
            </div>

            {/* User grid */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 16px" }}>
              {loadingStatus ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>กำลังโหลด...</div>
              ) : readUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 14 }}>ยังไม่มีคนอ่าน</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {readUsers.map((u, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      {u.picture_url ? (
                        <img src={u.picture_url} alt={u.display_name}
                          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #E2E8F0" }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #E2E8F0" }}>
                          <User size={24} color="#3B82F6" />
                        </div>
                      )}
                      <span style={{ fontSize: 11, color: "#475569", textAlign: "center", fontWeight: 500, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
