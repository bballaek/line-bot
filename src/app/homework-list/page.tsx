"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";

type Homework = {
  id: string;
  subject: string;
  title: string;
  due_date: string | null;
  created_at: string;
  user_homeworks: { status: string }[];
};

type GroupedHomework = {
  [monthYear: string]: Homework[];
};

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function toBuddhistYear(year: number) {
  return year + 543;
}

function formatThaiMonthYear(dateStr: string) {
  const d = new Date(dateStr);
  return `${THAI_MONTHS[d.getMonth()]} ${toBuddhistYear(d.getFullYear())}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

export default function HomeworkListPage() {
  const { isReady, liffError, userId } = useLiff();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && userId) {
      fetchHomeworks();
    }
  }, [isReady, userId]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId as string)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from("homeworks")
        .select(`id, subject, title, due_date, created_at, user_homeworks ( status )`)
        .order("due_date", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((hw) => ({
        ...hw,
        user_homeworks: hw.user_homeworks || [],
      })) as Homework[];

      setHomeworks(formattedData);
    } catch (error) {
      console.error("Error fetching homeworks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group homeworks by month/year
  const grouped: GroupedHomework = {};
  homeworks.forEach((hw) => {
    const key = hw.due_date ? formatThaiMonthYear(hw.due_date) : "ไม่มีกำหนดส่ง";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(hw);
  });

  const handleCreateHomework = () => {
    window.location.href = "/add-homework";
  };

  if (liffError) return <div className="p-4 text-red-500">Error: {liffError}</div>;
  if (!isReady) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8E1 0%, #FFFDF5 100%)",
        fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
        paddingBottom: "80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #FFB300 0%, #FFA000 100%)",
          padding: "16px 20px",
          textAlign: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: "17px",
          letterSpacing: "0.3px",
          boxShadow: "0 2px 8px rgba(255,160,0,0.3)",
        }}
      >
        📋 การบ้านทั้งหมด
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
            กำลังโหลดข้อมูล...
          </div>
        ) : homeworks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#999",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <div style={{ fontWeight: 600, color: "#666" }}>ไม่มีการบ้านค้างส่ง</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>สบายใจได้เลย!</div>
          </div>
        ) : (
          Object.entries(grouped).map(([monthYear, items]) => (
            <div key={monthYear} style={{ marginBottom: "24px" }}>
              {/* Month Header */}
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#333",
                  marginBottom: "12px",
                  paddingLeft: "4px",
                }}
              >
                {monthYear}
              </h2>

              {/* Homework Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {items.map((hw) => {
                  const dueDate = hw.due_date ? new Date(hw.due_date) : null;
                  const dayName = dueDate ? THAI_DAYS[dueDate.getDay()] : "";
                  const dateNum = dueDate ? dueDate.getDate() : "";
                  const doneCount = hw.user_homeworks.filter((uh) => uh.status === "done").length;
                  const totalCount = hw.user_homeworks.length || 1;
                  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                  const isAllDone = doneCount === totalCount && totalCount > 0;

                  return (
                    <div
                      key={hw.id}
                      style={{
                        display: "flex",
                        background: "#fff",
                        borderRadius: "14px",
                        overflow: "hidden",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                        border: "1px solid #f0e8d0",
                      }}
                    >
                      {/* Left: Day + Date */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "16px 14px",
                          minWidth: "70px",
                          borderRight: "1px solid #f0e8d0",
                          color: "#888",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>{dayName}</span>
                        <span style={{ fontSize: "28px", fontWeight: 700, color: "#333", lineHeight: 1.2 }}>
                          {dateNum}
                        </span>
                      </div>

                      {/* Right: Details */}
                      <div style={{ flex: 1, padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "#222", marginBottom: "4px" }}>
                          {hw.title}
                        </div>
                        {dueDate && (
                          <div style={{ fontSize: "12px", color: "#999", marginBottom: "10px" }}>
                            ส่งก่อน {formatTime(hw.due_date!)}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div
                          style={{
                            height: "6px",
                            background: "#f0f0f0",
                            borderRadius: "3px",
                            overflow: "hidden",
                            marginBottom: "6px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${progress}%`,
                              background: isAllDone
                                ? "linear-gradient(90deg, #4CAF50, #66BB6A)"
                                : "linear-gradient(90deg, #FFB300, #FFC107)",
                              borderRadius: "3px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>

                        {/* Status text */}
                        <div style={{ textAlign: "right" }}>
                          {isAllDone ? (
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#4CAF50" }}>
                              อ่านครบทุกคนแล้ว!
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#FFB300", fontWeight: 600 }}>
                              อ่านแล้ว{" "}
                              <span style={{ fontWeight: 700 }}>{doneCount}</span>
                              <span style={{ color: "#ccc" }}>/{totalCount}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Footer Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #f0e8d0",
          zIndex: 100,
        }}
      >
        <button
          onClick={handleCreateHomework}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "400px",
            margin: "0 auto",
            padding: "14px",
            background: "linear-gradient(135deg, #FFB300 0%, #FFA000 100%)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            border: "none",
            borderRadius: "50px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(255,160,0,0.35)",
            letterSpacing: "0.5px",
          }}
        >
          สร้างการบ้าน
        </button>
      </div>
    </div>
  );
}
