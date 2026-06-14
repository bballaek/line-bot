import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/user-access";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!q || !lineUserId) {
      return NextResponse.json({ error: "q and line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: requester } = await supabase
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .single();

    if (!requester || resolveRole(lineUserId, requester.role) !== "teacher") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, picture_url")
      .ilike("display_name", `%${q}%`)
      .neq("id", requester.id)
      .limit(10);

    if (error) throw error;

    const existing = await supabase
      .from("co_teachers")
      .select("teacher_id")
      .eq("owner_id", requester.id);

    const existingIds = new Set((existing.data || []).map((r) => r.teacher_id));
    const users = (data || []).filter((u) => !existingIds.has(u.id));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Co-teachers search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
