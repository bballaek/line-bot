import { supabase } from "@/lib/supabase";

export async function ensureUser(lineUserId: string, displayName = "LIFF User"): Promise<string> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("users")
    .upsert({ line_user_id: lineUserId, display_name: displayName }, { onConflict: "line_user_id" })
    .select("id")
    .single();
  if (error) throw new Error("ไม่สามารถสร้างผู้ใช้ได้: " + error.message);
  if (!created) throw new Error("ไม่สามารถสร้างผู้ใช้ได้");
  return created.id;
}
