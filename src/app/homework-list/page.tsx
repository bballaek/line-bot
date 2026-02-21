"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

type Homework = {
  id: string;
  subject: string;
  title: string;
  due_date: string | null;
  created_at: string;
  user_homeworks: { status: string }[];
};

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
      // Fetch user's internal ID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId as string)
        .single();

      if (!userData) return;

      // Fetch all homeworks
      // In a real app, you might want to filter by group or relevance
      // Here we fetch all homeworks and join with user_homeworks to get status
      const { data, error } = await supabase
        .from("homeworks")
        .select(`
          id, subject, title, due_date, created_at,
          user_homeworks ( status )
        `)
        .order("due_date", { ascending: true }); // nearest first

      if (error) throw error;

      // Filter and format the data
      const formattedData = data?.map(hw => ({
        ...hw,
        user_homeworks: hw.user_homeworks || []
      })) as Homework[];

      setHomeworks(formattedData);
    } catch (error) {
      console.error("Error fetching homeworks:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsDone = async (homeworkId: string) => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId as string)
        .single();
      
      if (!userData) return;

      // Upsert status to "done"
      const { error } = await supabase
        .from("user_homeworks")
        .upsert(
          { 
            user_id: userData.id, 
            homework_id: homeworkId, 
            status: "done",
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,homework_id" }
        );

      if (error) throw error;

      // Refresh list
      fetchHomeworks();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const formatDueDateMessage = (dateString: string | null) => {
    if (!dateString) return "ไม่มีกำหนดส่ง";
    const date = new Date(dateString);
    if (isPast(date)) return "เลยกำหนดแล้ว!";
    if (isToday(date)) return "ส่งวันนี้";
    if (isTomorrow(date)) return "ส่งพรุ่งนี้";
    return `เหลืออีก ${formatDistanceToNow(date, { locale: th })}`;
  };

  if (liffError) return <div className="p-4 text-red-500">Error: {liffError}</div>;
  if (!isReady) return <div className="p-4 text-center">Loading LIFF...</div>;

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600">📋 รายการการบ้าน</h1>
      
      {loading ? (
        <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
          🎉 ไม่มีหน้าบ้านค้างส่ง สบายใจได้เลย!
        </div>
      ) : (
        <div className="space-y-4">
          {homeworks.map((hw) => {
            const isDone = hw.user_homeworks.some(uh => uh.status === "done");
            
            return (
              <div 
                key={hw.id} 
                className={`p-4 rounded-xl shadow-sm border ${
                  isDone 
                    ? "bg-gray-50 border-gray-200 opacity-60" 
                    : "bg-white border-indigo-100"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isDone ? "bg-gray-200 text-gray-600" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    {hw.subject}
                  </span>
                  
                  {hw.due_date && (
                    <span className={`text-xs font-medium flex items-center ${
                      isPast(new Date(hw.due_date)) && !isDone 
                        ? "text-red-600" 
                        : "text-gray-500"
                    }`}>
                      ⏰ {formatDueDateMessage(hw.due_date)}
                    </span>
                  )}
                </div>
                
                <h3 className={`text-lg font-bold mb-1 ${isDone ? "text-gray-600 line-through" : "text-gray-900"}`}>
                  {hw.title}
                </h3>
                
                {hw.due_date && (
                  <div className="text-sm text-gray-500 mb-4">
                    กำหนดส่ง: {format(new Date(hw.due_date), "d MMM yyyy HH:mm", { locale: th })}
                  </div>
                )}
                
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                  {isDone ? (
                    <span className="text-green-600 font-medium text-sm flex items-center">
                      ✅ ส่งแล้ว
                    </span>
                  ) : (
                    <button 
                      onClick={() => markAsDone(hw.id)}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition"
                    >
                      ทำเสร็จแล้ว
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
