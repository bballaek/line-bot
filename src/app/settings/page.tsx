"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { isReady, liffError, userId } = useLiff();
  const [notifyTime, setNotifyTime] = useState("19:00");
  const [notifyDays, setNotifyDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const daysOptions = [
    { label: "1 วันก่อนส่ง", value: 1 },
    { label: "3 วันก่อนส่ง", value: 3 },
    { label: "5 วันก่อนส่ง", value: 5 },
    { label: "7 วันก่อนส่ง", value: 7 },
  ];

  useEffect(() => {
    if (isReady && userId) {
      fetchSettings();
    }
  }, [isReady, userId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId as string)
        .single();
      
      if (!userData) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userData.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned yet

      if (data) {
        setNotifyTime(data.notify_time || "19:00");
        setNotifyDays(data.notify_days || []);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayValue: number) => {
    setNotifyDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage("");
    
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId as string)
        .single();
      
      if (!userData) throw new Error("User not found");

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: userData.id,
            notify_time: notifyTime,
            notify_days: notifyDays
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      setSuccessMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  if (liffError) return <div className="p-4 text-red-500">Error: {liffError}</div>;
  if (!isReady || loading) return <div className="p-4 text-center">Loading Settings...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600">⚙️ ตั้งค่าการแจ้งเตือน</h1>
      
      {successMessage && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">เวลาที่ต้องการให้แจ้งเตือน</label>
          <input
            type="time"
            className="w-full border border-gray-300 rounded-md p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={notifyTime}
            onChange={(e) => setNotifyTime(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">บอทจะสรุปการบ้านให้ตามเวลานี้</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3">แจ้งเตือนล่วงหน้า (เลือกได้หลายข้อ)</label>
          <div className="grid grid-cols-2 gap-3">
            {daysOptions.map(option => (
              <button
                key={option.value}
                onClick={() => toggleDay(option.value)}
                className={`py-3 px-2 rounded-xl border text-sm font-medium transition-colors ${
                  notifyDays.includes(option.value)
                    ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-8 bg-indigo-600 text-white font-medium py-3 rounded-xl shadow-sm hover:bg-indigo-700 transition disabled:bg-gray-400"
        >
          {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}
