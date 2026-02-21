"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Megaphone, CalendarDays, FileEdit, AlertCircle, Bell, CheckCircle2, User } from "lucide-react";

type Announcement = {
  id: string; title: string; content: string; pinned: boolean; created_at: string;
  created_by: string;
};
type ReadUser = { display_name: string; picture_url: string | null; read_at: string };

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function formatDateFull(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

export default function AnnouncementDetailPage() {
  const params = useParams();
  const annId = params.id as string;
  const { isReady, liffError, userId } = useLiff();

  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Status view
  const [showStatus, setShowStatus] = useState(false);
  const [readUsers, setReadUsers] = useState<ReadUser[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => { if (isReady && userId && annId) loadData(); }, [isReady, userId, annId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get db user
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      setDbUserId(userData.id);

      // Get announcement
      const { data: annData } = await supabase.from("announcements").select("*").eq("id", annId).single();
      if (!annData) return;
      setAnn(annData);
      setIsCreator(annData.created_by === userData.id);

      // Check if already read
      const { data: readData } = await supabase.from("announcement_reads")
        .select("id").eq("announcement_id", annId).eq("user_id", userData.id).single();
      setHasRead(!!readData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAcknowledge = async () => {
    if (!dbUserId || hasRead) return;
    setAcknowledging(true);
    try {
      await supabase.from("announcement_reads").insert({
        announcement_id: annId, user_id: dbUserId,
      });
      setHasRead(true);
    } catch (e: any) { console.error(e); alert("เกิดข้อผิดพลาด"); }
    finally { setAcknowledging(false); }
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data } = await supabase.from("announcement_reads")
        .select("read_at, user_id, users ( display_name, picture_url )")
        .eq("announcement_id", annId)
        .order("read_at", { ascending: true });

      const reads: ReadUser[] = (data || []).map((r: any) => ({
        display_name: r.users?.display_name || "ไม่ทราบชื่อ",
        picture_url: r.users?.picture_url || null,
        read_at: r.read_at,
      }));
      setReadUsers(reads);
    } catch (e) { console.error(e); }
    finally { setLoadingStatus(false); }
  };

  const openStatus = () => { setShowStatus(true); loadStatus(); };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || loading) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;
  if (!ann) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>ไม่พบประกาศ</div>;

  const typeLabel = ann.pinned ? "แจ้งเพื่อดำเนินการ" : "แจ้งเพื่อทราบ";
  const typeColor = ann.pinned ? "#D97706" : "#3B82F6";
  const TypeIcon = ann.pinned ? AlertCircle : FileEdit;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/announcements")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>ประกาศ</h1>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        {/* Title card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "20px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Megaphone size={18} color="#2563EB" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", margin: 0, flex: 1, lineHeight: 1.4 }}>{ann.title}</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <CalendarDays size={13} color="#94A3B8" />
            <span style={{ fontSize: 12, color: "#94A3B8" }}>กำหนดการณ์: {formatDateFull(ann.created_at)}</span>
          </div>

          {/* Content body */}
          {ann.content && (
            <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 16 }}>
              {ann.content}
            </div>
          )}

          {/* Type + notification info */}
          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TypeIcon size={15} color={typeColor} />
              <span style={{ fontSize: 13, fontWeight: 600, color: typeColor }}>{typeLabel}</span>
            </div>
          </div>
        </div>

        {/* Creator: Status button */}
        {isCreator && (
          <button onClick={openStatus}
            style={{ width: "100%", padding: "14px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "#1E293B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={18} color="#2563EB" /> สถานะการรับทราบ
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
              <CheckCircle2 size={20} /> รับทราบแล้ว
            </div>
          ) : (
            <button onClick={handleAcknowledge} disabled={acknowledging}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: acknowledging ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: acknowledging ? "not-allowed" : "pointer" }}>
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
                {ann.title}
              </h3>
            </div>

            {/* Tab header */}
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "14px 0", fontWeight: 700, fontSize: 14, color: "#1E293B", borderBottom: "3px solid #2563EB" }}>
                รับทราบแล้ว ({readUsers.length})
              </div>
            </div>

            {/* User grid */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 16px" }}>
              {loadingStatus ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>กำลังโหลด...</div>
              ) : readUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 14 }}>ยังไม่มีคนรับทราบ</div>
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
