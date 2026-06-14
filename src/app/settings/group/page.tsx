"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/ensure-user";
import { GROUP_OPTIONS } from "@/lib/settings-constants";
import SettingsLayout, { SettingsCard, SettingsSaveBar } from "@/components/settings/SettingsLayout";

export default function GroupSettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user } = useAppUser();
  const [targetGroup, setTargetGroup] = useState("All");
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
        .select("target_group")
        .eq("user_id", dbId)
        .maybeSingle();
      if (data?.target_group) setTargetGroup(data.target_group);
    } catch (e) {
      console.error("loadSettings error:", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const dbId = user?.id ?? await ensureUser(userId as string);
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", dbId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ target_group: targetGroup })
          .eq("user_id", dbId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: dbId, target_group: targetGroup, notify_days: ["1d"] });
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
    <SettingsLayout title="ตั้งค่า Group" breadcrumb="ตั้งค่า Group">
      <p style={{ fontSize: 14, color: "#795548", marginBottom: 16, lineHeight: 1.6 }}>
        เลือกกลุ่มเรียนที่ต้องการดูการบ้านและประกาศ
      </p>

      <SettingsCard>
        {GROUP_OPTIONS.map((grp, i) => (
          <label
            key={grp.value}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "16px 18px",
              cursor: "pointer", borderBottom: i < GROUP_OPTIONS.length - 1 ? "1px solid #F5E6D3" : "none",
            }}
          >
            <div
              onClick={() => setTargetGroup(grp.value)}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                border: targetGroup === grp.value ? "none" : "2px solid #D7CCC8",
                background: targetGroup === grp.value ? "#FFC107" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {targetGroup === grp.value && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3E2723" }} />
              )}
            </div>
            <span style={{ fontSize: 15, color: "#3E2723", fontWeight: 500 }}>{grp.label}</span>
          </label>
        ))}
      </SettingsCard>

      <SettingsSaveBar onSave={handleSave} saving={saving} saved={saved} />
      <div style={{ height: 80 }} />
    </SettingsLayout>
  );
}
