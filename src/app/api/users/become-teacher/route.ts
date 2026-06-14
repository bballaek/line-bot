import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_user_id, invite_code, display_name, picture_url } = body;

    if (!line_user_id || !invite_code) {
      return NextResponse.json({ error: "กรุณากรอกรหัสเชิญ" }, { status: 400 });
    }

    const expectedCode = process.env.TEACHER_INVITE_CODE?.trim();
    if (!expectedCode) {
      return NextResponse.json({ error: "ระบบยังไม่ได้เปิดรับสมัครครู" }, { status: 503 });
    }

    if (invite_code.trim() !== expectedCode) {
      return NextResponse.json({ error: "รหัสเชิญไม่ถูกต้อง" }, { status: 403 });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("users")
      .select("display_name, picture_url")
      .eq("line_user_id", line_user_id)
      .maybeSingle();

    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          line_user_id,
          display_name: display_name || existing?.display_name || "LIFF User",
          picture_url: picture_url ?? existing?.picture_url ?? null,
          role: "teacher",
        },
        { onConflict: "line_user_id" }
      )
      .select("id, line_user_id, display_name, picture_url, role")
      .single();

    if (error || !user) {
      console.error("Become teacher upsert error:", error);
      return NextResponse.json({ error: "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }

    return NextResponse.json({ user, message: "ลงทะเบียนเป็นครูสำเร็จ" });
  } catch (error: any) {
    console.error("Become teacher error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
