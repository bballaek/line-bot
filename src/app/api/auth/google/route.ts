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
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .single();

    if (!user || resolveRole(lineUserId, user.role) !== "teacher") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เชื่อมต่อ Google Drive" }, { status: 403 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;

    if (!clientId) {
      return NextResponse.json({
        error: "ยังไม่ได้ตั้งค่า Google OAuth กรุณาเพิ่ม GOOGLE_CLIENT_ID ใน environment variables",
      }, { status: 503 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.file email",
      access_type: "offline",
      prompt: "consent",
      state: lineUserId,
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
