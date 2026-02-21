"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check, Plus } from "lucide-react";

const PRESET_OPTIONS = [
  { label: "1 ชั่วโมงก่อนกำหนดส่ง", value: "1h" },
  { label: "6 ชั่วโมงก่อนกำหนดส่ง", value: "6h" },
  { label: "1 วันก่อนวันกำหนดส่ง", value: "1d" },
  { label: "3 วันก่อนวันกำหนดส่ง", value: "3d" },
  { label: "1 สัปดาห์ก่อนวันกำหนดส่ง", value: "1w" },
];

const MAX_SELECTIONS = 3;

export default function SettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const [selected, setSelected] = useState<string[]>(["1d"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>Loading...</div>;

  useEffect(() => {
    if (isReady && userId) loadSettings();
  }, [isReady, userId]);

  const loadSettings = async () => {
    try {
      const { data: userData } = await supabase
        .from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) return;
      const { data } = await supabase
        .from("user_settings").select("notify_days").eq("user_id", userData.id).single();
      if (data?.notify_days && Array.isArray(data.notify_days)) {
        setSelected(data.notify_days);
      }
    } catch (e) { console.error(e); }
  };

  const toggleOption = (val: string) => {
    setSelected((prev) => {
      if (prev.includes(val)) return prev.filter((v) => v !== val);
      if (prev.length >= MAX_SELECTIONS) {
        alert(`เลือกได้สูงสุด ${MAX_SELECTIONS} อัน`);
        return prev;
      }
      return [...prev, val];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data: userData } = await supabase
        .from("users").select("id").eq("line_user_id", userId as string).single();
      if (!userData) throw new Error("User not found");

      await supabase.from("user_settings").upsert(
        { user_id: userData.id, notify_days: selected },
        { onConflict: "user_id" }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "14px 16px", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #E2E8F0" }}>
        <button onClick={() => (window.location.href = "/homework-list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#475569", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0, paddingRight: 36 }}>ตั้งค่า</h1>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", flex: 1, paddingBottom: 100 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 16 }}>การแจ้งเตือนก่อนถึงกำหนด</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {PRESET_OPTIONS.map((opt, i) => {
            const isSelected = selected.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "#fff", cursor: "pointer",
                  borderTop: i === 0 ? "1px solid #E2E8F0" : "none",
                  borderLeft: "1px solid #E2E8F0", borderRight: "1px solid #E2E8F0",
                  borderBottom: "1px solid #E2E8F0",
                  borderRadius: i === 0 ? "12px 12px 0 0" : i === PRESET_OPTIONS.length - 1 ? "0 0 12px 12px" : 0,
                }}
              >
                <span style={{ fontSize: 14, color: "#1E293B" }}>{opt.label}</span>
                {isSelected && <Check size={18} color="#2563EB" />}
              </div>
            );
          })}
        </div>

        {/* Custom option */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 16px", marginTop: 12, cursor: "pointer",
            color: "#2563EB", fontSize: 14, fontWeight: 500,
          }}
        >
          <Plus size={16} /> กำหนดเอง
        </div>

        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, paddingLeft: 4 }}>
          เลือกได้สูงสุด {MAX_SELECTIONS} รายการ (เลือกแล้ว {selected.length}/{MAX_SELECTIONS})
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "rgba(240,244,250,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E2E8F0", zIndex: 100 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 400, margin: "0 auto", padding: 14, background: saving ? "#94A3B8" : "#2563EB", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 50, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว!" : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
