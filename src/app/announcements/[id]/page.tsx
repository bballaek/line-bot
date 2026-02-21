"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CalendarDays, FileEdit, AlertCircle, Bell, Check, Users } from "lucide-react";

type Announcement = {
  id: string; title: string; content: string; pinned: boolean; created_at: string;
};

type AckUser = {
  user_id: string;
  display_name: string;
  picture_url: string | null;
  acknowledged: boolean;
};

export default function AnnouncementDetailPage() {
  const params = useParams();
  const annId = params.id as string;
  const { isReady, liffError, userId } = useLiff();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [acked, setAcked] = useState(false);
  const [acking, setAcking] = useState(false);

  // Tracking tab
  const [showTracking, setShowTracking] = useState(false);
  const [activeTab, setActiveTab] = useState<"ack" | "notack">("ack");
  const [ackUsers, setAckUsers] = useState<AckUser[]>([]);

  useEffect(() => { if (isReady && userId && annId) fetchDetail(); }, [isReady, userId, annId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("announcements").select("*").eq("id", annId).single();
      if (error) throw error;
      setAnn(data);

      // Check if current user acknowledged
      if (userId) {
        const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId).single();
        if (userData) {
          const { data: ackData } = await supabase
            .from("user_homeworks")
            .select("id")
            .eq("homework_id", annId)
            .eq("user_id", userData.id)
            .eq("status", "done")
            .maybeSingle();
          setAcked(!!ackData);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAck = async () => {
    if (!userId) return;
    setAcking(true);
    try {
      const { data: userData } = await supabase.from("users").select("id").eq("line_user_id", userId).single();
      if (!userData) return;
      await supabase.from("user_homeworks").upsert(
        { user_id: userData.id, homework_id: annId, status: "done", updated_at: new Date().toISOString() },
        { onConflict: "user_id,homework_id" }
      );
      setAcked(true);
    } catch (e) { console.error(e); }
    finally { setAcking(false); }
  };

  const fetchAckUsers = async () => {
    try {
      // Get all users who acknowledged
      const { data: ackData } = await supabase
        .from("user_homeworks")
        .select("user_id, users!inner(display_name, picture_url)")
        .eq("homework_id", annId)
        .eq("status", "done");

      const acknowledgedIds = new Set((ackData || []).map((a: any) => a.user_id));

      // Get all users
      const { data: allUsers } = await supabase.from("users").select("id, display_name, picture_url");

      const result: AckUser[] = (allUsers || []).map((u: any) => ({
        user_id: u.id,
        display_name: u.display_name || "ไม่ทราบชื่อ",
        picture_url: u.picture_url,
        acknowledged: acknowledgedIds.has(u.id),
      }));
      setAckUsers(result);
    } catch (e) { console.error(e); }
  };

  const openTracking = () => {
    setShowTracking(true);
    fetchAckUsers();
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || loading) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;
  if (!ann) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>ไม่พบประกาศ</div>;

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const ackedList = ackUsers.filter((u) => u.acknowledged);
  const notAckedList = ackUsers.filter((u) => !u.acknowledged);

  if (showTracking) {
    return (
      <div style={{ minHeight: "100vh", background: "#F0F4FA" }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
          <button onClick={() => setShowTracking(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ann.title}</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", background: "#fff" }}>
          {[{ key: "ack" as const, label: `รับทราบแล้ว (${ackedList.length})` },
            { key: "notack" as const, label: `ยังไม่ได้รับทราบ (${notAckedList.length})` }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: "12px 0", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer",
                color: activeTab === tab.key ? "#1E293B" : "#94A3B8",
                borderBottom: activeTab === tab.key ? "3px solid #2563EB" : "3px solid transparent" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users grid */}
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(activeTab === "ack" ? ackedList : notAckedList).map((u) => (
              <div key={u.user_id} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 6px", background: "#E2E8F0", overflow: "hidden", border: "2px solid #DBEAFE" }}>
                  {u.picture_url ? (
                    <img src={u.picture_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontWeight: 700, fontSize: 18 }}>
                      {u.display_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.display_name}</div>
              </div>
            ))}
          </div>
          {(activeTab === "ack" ? ackedList : notAckedList).length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 13 }}>
              {activeTab === "ack" ? "ยังไม่มีคนรับทราบ" : "ทุกคนรับทราบแล้ว"}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column" }}>
      {/* Header image placeholder */}
      <div style={{ background: "#DBEAFE", height: 180, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Megaphone size={48} color="#3B82F6" />
        <button onClick={() => (window.location.href = "/announcements")}
          style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={20} color="#475569" />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>{ann.title}</h1>
        <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
          <CalendarDays size={13} /> กำหนดการณ์: {formatDate(ann.created_at)}
        </div>

        {ann.content && (
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-wrap" }}>{ann.content}</p>
        )}

        {/* Type */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderTop: "1px solid #F1F5F9", marginBottom: 8 }}>
          {ann.pinned ? <AlertCircle size={16} color="#D97706" /> : <FileEdit size={16} color="#3B82F6" />}
          <span style={{ fontSize: 13, color: "#64748B" }}>{ann.pinned ? "แจ้งเพื่อดำเนินการ" : "แจ้งเพื่อทราบ"}</span>
        </div>

        {/* Tracking button */}
        <button onClick={openTracking}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderTop: "1px solid #F1F5F9", background: "none", border: "none", cursor: "pointer", width: "100%" }}>
          <Users size={16} color="#3B82F6" />
          <span style={{ fontSize: 13, color: "#3B82F6", fontWeight: 600 }}>ดูสถานะการรับทราบ</span>
        </button>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={handleAck} disabled={acked || acking}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14,
            background: acked ? "#22C55E" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: acked ? "default" : "pointer" }}>
          {acked ? (<><Check size={18} /> รับทราบแล้ว</>) : acking ? "กำลังบันทึก..." : "ฉันอ่านและรับทราบแล้ว"}
        </button>
      </div>
    </div>
  );
}
