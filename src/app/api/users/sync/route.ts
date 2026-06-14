import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/user-access";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_user_id, display_name, picture_url } = body;
    if (!line_user_id) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: existingBeforeUpsert } = await supabase
      .from("users")
      .select("role")
      .eq("line_user_id", line_user_id)
      .maybeSingle();

    const role = resolveRole(line_user_id, existingBeforeUpsert?.role);

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          line_user_id,
          display_name: display_name || "LIFF User",
          picture_url: picture_url || null,
          role,
        },
        { onConflict: "line_user_id" }
      )
      .select("id, line_user_id, display_name, picture_url, role")
      .single();

    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (error: any) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("users")
      .select("id, line_user_id, display_name, picture_url, role")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    const role = resolveRole(lineUserId, existing?.role);

    if (existing) {
      if (existing.role !== role) {
        const { data: updated } = await supabase
          .from("users")
          .update({ role })
          .eq("id", existing.id)
          .select("id, line_user_id, display_name, picture_url, role")
          .single();
        return NextResponse.json({ user: updated });
      }
      return NextResponse.json({ user: existing });
    }

    return NextResponse.json({ user: null });
  } catch (error: any) {
    console.error("User fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
