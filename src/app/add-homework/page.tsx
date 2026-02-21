"use client";

import { useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";

export default function AddHomeworkPage() {
  const { isReady, liffError, userId } = useLiff();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (liffError) return <div className="p-4 text-red-500">Error: {liffError}</div>;
  if (!isReady) return <div className="p-4 text-center">Loading LIFF...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");

    try {
      if (!userId) throw new Error("User ID not found");

      // We need to fetch the internal user UUID associated with this LINE user ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", userId)
        .single();
      
      if (userError || !userData) {
          throw new Error("Could not verify user in database.");
      }

      const { error } = await supabase.from("homeworks").insert({
        created_by: userData.id,
        subject,
        title,
        description,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });

      if (error) throw error;

      setSuccessMessage("บันทึกการบ้านเรียบร้อยแล้ว!");
      setSubject("");
      setTitle("");
      setDescription("");
      setDueDate("");

      // Optional: Send a message on behalf of the user to confirm via liff.sendMessages
      // ...
    } catch (error: any) {
      console.error(error);
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600">➕ เพิ่มการบ้าน</h1>
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">วิชา</label>
          <input
            type="text"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="เช่น คณิตศาสตร์"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">หัวข้อการบ้าน</label>
          <input
            type="text"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="ทำแบบฝึกหัดหน้า 45"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">รายละเอียด (ใส่หรือไม่ก็ได้)</label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            rows={3}
            placeholder="ครูสั่งให้ทำข้อ 1-10 ถ่ายรูปส่งในอัลบั้มด้วย"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">กำหนดส่ง</label>
          <input
            type="datetime-local"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700 transition disabled:bg-gray-400"
        >
          {loading ? "กำลังบันทึก..." : "📥 บันทึกการบ้าน"}
        </button>
      </form>
    </div>
  );
}
