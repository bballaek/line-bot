"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { SettingsCard } from "@/components/settings/SettingsLayout";
import { useLiff } from "@/lib/liff-provider";

type Props = {
  lineUserId: string;
  onSuccess: () => void;
};

export default function BecomeTeacherCard({ lineUserId, onSuccess }: Props) {
  const { profile } = useLiff();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError("กรุณากรอกรหัสเชิญ");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: lineUserId,
          display_name: profile?.displayName,
          picture_url: profile?.pictureUrl ?? null,
        }),
      });

      const res = await fetch("/api/users/become-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: lineUserId,
          invite_code: code.trim(),
          display_name: profile?.displayName,
          picture_url: profile?.pictureUrl ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลงทะเบียนไม่สำเร็จ");
      alert("ลงทะเบียนเป็นครูสำเร็จ! ตอนนี้คุณสามารถสร้างการบ้านและเชื่อม Google Drive ได้แล้ว");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsCard>
      <div style={{ padding: "20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#FFF8E1",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#F9A825",
          }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>ลงทะเบียนเป็นครู</div>
            <div style={{ fontSize: 12, color: "#A1887F", marginTop: 2 }}>ใส่รหัสเชิญจากโรงเรียน</div>
          </div>
        </div>

        <input
          type="text"
          placeholder="รหัสเชิญครู"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "12px 14px", border: `1px solid ${error ? "#FFCDD2" : "#F5E6D3"}`,
            borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
            marginBottom: error ? 6 : 12,
          }}
        />
        {error && <div style={{ fontSize: 12, color: "#E53935", marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%", padding: 12, background: submitting ? "#FFE082" : "#FFC107",
            color: "#3E2723", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "กำลังตรวจสอบ..." : "ยืนยันเป็นครู"}
        </button>

        <p style={{ fontSize: 12, color: "#A1887F", marginTop: 12, lineHeight: 1.6, marginBottom: 0 }}>
          หรือให้ครูหลักเพิ่มคุณเป็น &quot;ครูผู้สอนร่วม&quot; ก็สามารถสร้างการบ้านและประกาศได้
        </p>
      </div>
    </SettingsCard>
  );
}
