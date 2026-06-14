"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/ensure-user";
import { NOTIFY_PRESETS, MAX_NOTIFY_SELECTIONS } from "@/lib/settings-constants";
import SettingsLayout, { SettingsCard, SettingsSaveBar } from "@/components/settings/SettingsLayout";
import { Check } from "lucide-react";

export default function NotificationsSettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user } = useAppUser();
  const [selected, setSelected] = useState<string[]>(["1d"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isReady && userId) loadSettings();
  }, [isReady, userId, user?.id]);

  const loadSettings = async () => {
    try {
      const dbId = user?.id ?? await ensureUser(userId as string);
      const { data } = await supabase
        .from("user_settings")
        .select("notify_days")
        .eq("user_id", dbId)
        .maybeSingle();
      if (data?.notify_days && Array.isArray(data.notify_days)) {
        setSelected(data.notify_days);
      }
    } catch (e) {
      console.error("loadSettings error:", e);
    }
  };

  const toggleOption = (val: string) => {
    setSelected((prev) => {
      if (prev.includes(val)) return prev.filter((v) => v !== val);
      if (prev.length >= MAX_NOTIFY_SELECTIONS) {
        alert(`เลือกได้สูงสุด ${MAX_NOTIFY_SELECTIONS} อัน`);
        return prev;
      }
      return [...prev, val];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const dbId = user?.id ?? await ensureUser(userId as string);
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id, target_group")
        .eq("user_id", dbId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ notify_days: selected })
          .eq("user_id", dbId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: dbId, notify_days: selected, target_group: "All" });
        if (error) throw error;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("บันทึกไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady) return <div style={{ padding: 16, textAlign: "center", color: "#A1887F" }}>Loading...</div>;

  return (
    <SettingsLayout title="การแจ้งเตือน" breadcrumb="การแจ้งเตือน">
      <p style={{ fontSize: 14, color: "#795548", marginBottom: 16, lineHeight: 1.6 }}>
        เลือกช่วงเวลาแจ้งเตือนก่อนถึงกำหนดส่งการบ้าน
      </p>

      <SettingsCard>
        {NOTIFY_PRESETS.map((opt, i) => {
          const isSelected = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 18px", cursor: "pointer",
                borderBottom: i < NOTIFY_PRESETS.length - 1 ? "1px solid #F5E6D3" : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#3E2723" }}>{opt.label}</span>
              {isSelected && <Check size={18} color="#F9A825" />}
            </div>
          );
        })}
      </SettingsCard>

      <div style={{ fontSize: 12, color: "#A1887F", marginTop: 12, paddingLeft: 4 }}>
        เลือกได้สูงสุด {MAX_NOTIFY_SELECTIONS} รายการ (เลือกแล้ว {selected.length}/{MAX_NOTIFY_SELECTIONS})
      </div>

      <SettingsSaveBar onSave={handleSave} saving={saving} saved={saved} />
      <div style={{ height: 80 }} />
    </SettingsLayout>
  );
}
