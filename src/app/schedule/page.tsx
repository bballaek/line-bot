"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { useAppUser } from "@/hooks/useAppUser";
import SettingsLayout, { SettingsCard } from "@/components/settings/SettingsLayout";
import SettingsMenuItem from "@/components/settings/SettingsMenuItem";
import BottomNav from "@/components/BottomNav";
import { CalendarDays, GraduationCap } from "lucide-react";

export default function ScheduleHubPage() {
  const { isReady, liffError, userId } = useLiff();
  const { loading: userLoading } = useAppUser();
  const [classroomCount, setClassroomCount] = useState<number | null>(null);

  useEffect(() => {
    if (isReady && userId) loadSummary();
  }, [isReady, userId]);

  const loadSummary = async () => {
    try {
      const res = await fetch(`/api/classrooms?line_user_id=${encodeURIComponent(userId!)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.active !== undefined) {
          setClassroomCount((data.active || []).length);
        } else {
          setClassroomCount((data.classrooms || []).length);
        }
      }
    } catch (e) {
      console.error("loadSummary error:", e);
    }
  };

  if (liffError) return <div style={{ padding: 16, color: "#E53935" }}>Error: {liffError}</div>;
  if (!isReady || userLoading) {
    return <div style={{ padding: 16, textAlign: "center", color: "#A1887F", background: "#FFF9F0", minHeight: "100vh" }}>Loading...</div>;
  }

  const classroomSubtitle = classroomCount == null
    ? "กำลังโหลด..."
    : classroomCount > 0
      ? `${classroomCount} ห้อง`
      : "สร้างห้องและดึงสมาชิกจากกลุ่ม LINE";

  return (
    <>
      <SettingsLayout title="ห้องเรียน" hideBack>
        <SettingsCard>
          <SettingsMenuItem
            icon={<CalendarDays size={20} />}
            title="ตารางเรียน"
            subtitle="ดูและแก้ไขตารางเรียนรายวัน"
            href="/schedule/timetable"
          />
          <SettingsMenuItem
            icon={<GraduationCap size={20} />}
            title="ห้องเรียน"
            subtitle={classroomSubtitle}
            href="/schedule/classrooms"
            isLast
          />
        </SettingsCard>
      </SettingsLayout>
      <BottomNav />
    </>
  );
}
