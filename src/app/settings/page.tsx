"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/ensure-user";
import { groupLabel, NOTIFY_PRESETS } from "@/lib/settings-constants";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import SettingsMenuItem from "@/components/settings/SettingsMenuItem";
import BottomNav from "@/components/BottomNav";
import BecomeTeacherCard from "@/components/settings/BecomeTeacherCard";
import { Users, FolderOpen, Bell, UserCog } from "lucide-react";

export default function SettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const { user, loading: userLoading, canManageIntegrations, refresh } = useAppUser();
  const [targetGroup, setTargetGroup] = useState("All");
  const [notifyCount, setNotifyCount] = useState(0);
  const [googleStatus, setGoogleStatus] = useState<string>("ยังไม่เชื่อมต่อ");
  const [coTeacherCount, setCoTeacherCount] = useState(0);

  useEffect(() => {
    if (isReady && userId) loadSummary();
  }, [isReady, userId, user?.id, user?.role, canManageIntegrations]);

  const loadSummary = async () => {
    try {
      const dbId = user?.id ?? await ensureUser(userId as string);
      const { data: settings } = await supabase
        .from("user_settings")
        .select("target_group, notify_days")
        .eq("user_id", dbId)
        .maybeSingle();

      if (settings?.target_group) setTargetGroup(settings.target_group);
      if (settings?.notify_days && Array.isArray(settings.notify_days)) {
        setNotifyCount(settings.notify_days.length);
      }

      if (canManageIntegrations) {
        const { data: integration } = await supabase
          .from("teacher_integrations")
          .select("google_email")
          .eq("user_id", dbId)
          .maybeSingle();
        setGoogleStatus(integration?.google_email || "ยังไม่เชื่อมต่อ");

        const { count } = await supabase
          .from("co_teachers")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", dbId);
        setCoTeacherCount(count ?? 0);
      }
    } catch (e) {
      console.error("loadSummary error:", e);
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>;
  }

  const notifySubtitle = notifyCount > 0 ? `${notifyCount} รายการที่เลือก` : "ยังไม่ได้ตั้งค่า";
  const coTeacherSubtitle = coTeacherCount > 0 ? `${coTeacherCount} คน` : "ยังไม่มีครูร่วม";

  return (
    <>
    <SettingsLayout title="ตั้งค่า" hideBack>
      <SettingsCard>
        <SettingsMenuItem
          icon={<Users size={20} />}
          title="ตั้งค่า Group"
          subtitle={groupLabel(targetGroup)}
          href="/settings/group"
        />
        {canManageIntegrations && (
          <SettingsMenuItem
            icon={<FolderOpen size={20} />}
            title="Google Drive"
            subtitle={googleStatus}
            href="/settings/google-drive"
          />
        )}
        <SettingsMenuItem
          icon={<Bell size={20} />}
          title="การแจ้งเตือน"
          subtitle={notifySubtitle}
          href="/settings/notifications"
          isLast={!canManageIntegrations}
        />
        {canManageIntegrations && (
          <SettingsMenuItem
            icon={<UserCog size={20} />}
            title="ครูผู้สอนร่วม"
            subtitle={coTeacherSubtitle}
            href="/settings/co-teachers"
            isLast
          />
        )}
      </SettingsCard>

      {user?.role === "student" && !user.isCoTeacher && userId && (
        <div style={{ marginTop: 20 }}>
          <BecomeTeacherCard lineUserId={userId} onSuccess={refresh} />
        </div>
      )}

      {user?.role === "student" && user.isCoTeacher && (
        <p style={{ fontSize: 13, color: "#A1887F", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          คุณเป็นครูผู้สอนร่วม — สร้างการบ้านและประกาศได้<br />
          การเชื่อม Google Drive สำหรับครูหลักเท่านั้น
        </p>
      )}
    </SettingsLayout>
    <BottomNav />
    </>
  );
}
