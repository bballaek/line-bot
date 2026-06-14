import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/user-access";

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

export type DbUser = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  role: string;
};

export async function getUserByLineId(
  supabase: SupabaseClient,
  lineUserId: string
): Promise<DbUser | null> {
  const { data } = await supabase
    .from("users")
    .select("id, line_user_id, display_name, picture_url, role")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  return data;
}

export async function canManageClass(
  supabase: SupabaseClient,
  user: DbUser
): Promise<boolean> {
  if (resolveRole(user.line_user_id, user.role) === "teacher") return true;
  const { count } = await supabase
    .from("co_teachers")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user.id);
  return (count ?? 0) > 0;
}
