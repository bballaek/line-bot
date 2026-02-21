"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { Megaphone, Plus, CalendarDays, Send } from "lucide-react";

type Announcement = {
  id: string; title: string; content: string; pinned: boolean; created_at: string;
};

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function AnnouncementsPage() {
  const { isReady, liffError, userId } = useLiff();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2563EB", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Megaphone size={20} color="#fff" />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>ประกาศทั้งหมด</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((ann) => (
              <div key={ann.id} onClick={() => (window.location.href = `/announcements/${ann.id}`)}
                style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", cursor: "pointer" }}>
                {/* Color bar */}
                <div style={{ height: 4, background: ann.pinned ? "#F59E0B" : "#3B82F6" }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", flex: 1 }}>{ann.title}</div>
                    {ann.pinned && (
                      <span style={{ fontSize: 10, fontWeight: 600, background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 50 }}>ดำเนินการ</span>
                    )}
                  </div>
                  {ann.content && (
                    <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ann.content}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94A3B8" }}>
                    <CalendarDays size={12} /> {formatDate(ann.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={() => (window.location.href = "/announcements/create")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: "pointer" }}>
          <Plus size={18} /> สร้างประกาศ
        </button>
      </div>
    </div>
  );
}
