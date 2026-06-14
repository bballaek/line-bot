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
    const code = req.nextUrl.searchParams.get("code");
    const lineUserId = req.nextUrl.searchParams.get("state");
    const origin = req.nextUrl.origin;

    if (!code || !lineUserId) {
      return NextResponse.redirect(`${origin}/settings/google-drive?error=missing_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/settings/google-drive?error=not_configured`);
    }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .single();

    if (!user || resolveRole(lineUserId, user.role) !== "teacher") {
      return NextResponse.redirect(`${origin}/settings?error=unauthorized`);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Google token error:", tokens);
      return NextResponse.redirect(`${origin}/settings/google-drive?error=token_failed`);
    }

    let googleEmail: string | null = null;
    if (tokens.access_token) {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        googleEmail = profile.email || null;
      }
    }

    await supabase.from("teacher_integrations").upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        google_refresh_token: tokens.refresh_token || null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${origin}/settings/google-drive?connected=1`);
  } catch (error: any) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(`${req.nextUrl.origin}/settings/google-drive?error=callback_failed`);
  }
}
