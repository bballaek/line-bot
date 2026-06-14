import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { messagingApi } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/user-access";
import { buildCoTeacherInviteFlex } from "@/lib/flex-messages/co-teacher-invite";

const { MessagingApiClient } = messagingApi;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

function getLineClient() {
  return new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  });
}

async function getOwnerUser(supabase: ReturnType<typeof getSupabase>, lineUserId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("id, role, display_name, line_user_id")
    .eq("line_user_id", lineUserId)
    .single();
  if (!user) return null;
  if (resolveRole(lineUserId, user.role) !== "teacher") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");

    const supabase = getSupabase();

    if (!token && lineUserId) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("line_user_id", lineUserId)
        .single();

      if (!user) return NextResponse.json({ incoming: [] });

      const { data: rows } = await supabase
        .from("co_teacher_invites")
        .select("id, token, owner_id, created_at")
        .eq("invitee_id", user.id)
        .eq("status", "pending");

      const ownerIds = (rows || []).map((r) => r.owner_id);
      let ownersMap: Record<string, { display_name: string | null; picture_url: string | null }> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("users")
          .select("id, display_name, picture_url")
          .in("id", ownerIds);
        ownersMap = Object.fromEntries((owners || []).map((o) => [o.id, o]));
      }

      const incoming = (rows || []).map((row) => ({
        id: row.id,
        token: row.token,
        created_at: row.created_at,
        owner: {
          display_name: ownersMap[row.owner_id]?.display_name ?? "ครู",
          picture_url: ownersMap[row.owner_id]?.picture_url ?? null,
        },
      }));

      return NextResponse.json({ incoming });
    }

    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const { data: invite, error } = await supabase
      .from("co_teacher_invites")
      .select("id, token, status, owner_id, invitee_id, created_at")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      return NextResponse.json({ error: "ไม่พบคำเชิญ" }, { status: 404 });
    }

    const { data: owner } = await supabase
      .from("users")
      .select("display_name, picture_url")
      .eq("id", invite.owner_id)
      .single();

    const { data: invitee } = await supabase
      .from("users")
      .select("line_user_id, display_name")
      .eq("id", invite.invitee_id)
      .single();

    const isInvitee = lineUserId && invitee?.line_user_id === lineUserId;

    return NextResponse.json({
      invite: {
        token: invite.token,
        status: invite.status,
        created_at: invite.created_at,
      },
      owner: {
        display_name: owner?.display_name ?? "ครู",
        picture_url: owner?.picture_url ?? null,
      },
      is_invitee: isInvitee,
    });
  } catch (error: any) {
    console.error("Co-teacher invite GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_user_id, teacher_id, action, token } = body;

    const supabase = getSupabase();

    if (action === "respond") {
      if (!line_user_id || !token || !body.response) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }

      const { data: invite } = await supabase
        .from("co_teacher_invites")
        .select("id, owner_id, invitee_id, status")
        .eq("token", token)
        .maybeSingle();

      if (!invite) {
        return NextResponse.json({ error: "ไม่พบคำเชิญ" }, { status: 404 });
      }

      const { data: invitee } = await supabase
        .from("users")
        .select("id, line_user_id")
        .eq("id", invite.invitee_id)
        .single();

      if (!invitee || invitee.line_user_id !== line_user_id) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์ตอบคำเชิญนี้" }, { status: 403 });
      }

      if (invite.status !== "pending") {
        return NextResponse.json({ error: "คำเชิญนี้ตอบแล้ว" }, { status: 409 });
      }

      const accept = body.response === "accept";
      const newStatus = accept ? "accepted" : "declined";

      await supabase
        .from("co_teacher_invites")
        .update({ status: newStatus, responded_at: new Date().toISOString() })
        .eq("id", invite.id);

      if (accept) {
        const { error: insertErr } = await supabase.from("co_teachers").insert({
          owner_id: invite.owner_id,
          teacher_id: invite.invitee_id,
        });
        if (insertErr && insertErr.code !== "23505") throw insertErr;
      }

      return NextResponse.json({ success: true, status: newStatus });
    }

    if (action === "cancel") {
      if (!line_user_id || !token) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const owner = await getOwnerUser(supabase, line_user_id);
      if (!owner) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });

      await supabase
        .from("co_teacher_invites")
        .update({ status: "cancelled", responded_at: new Date().toISOString() })
        .eq("token", token)
        .eq("owner_id", owner.id)
        .eq("status", "pending");

      return NextResponse.json({ success: true });
    }

    // Create invite
    if (!line_user_id || !teacher_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const owner = await getOwnerUser(supabase, line_user_id);
    if (!owner) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });

    if (owner.id === teacher_id) {
      return NextResponse.json({ error: "ไม่สามารถเชิญตัวเองได้" }, { status: 400 });
    }

    const { data: existingCo } = await supabase
      .from("co_teachers")
      .select("id")
      .eq("owner_id", owner.id)
      .eq("teacher_id", teacher_id)
      .maybeSingle();

    if (existingCo) {
      return NextResponse.json({ error: "ครูคนนี้อยู่ในรายการแล้ว" }, { status: 409 });
    }

    const { data: pending } = await supabase
      .from("co_teacher_invites")
      .select("id, token")
      .eq("owner_id", owner.id)
      .eq("invitee_id", teacher_id)
      .eq("status", "pending")
      .maybeSingle();

    if (pending) {
      return NextResponse.json({
        error: "ส่งคำเชิญไปแล้ว รอการตอบรับ",
        token: pending.token,
      }, { status: 409 });
    }

    const { data: invitee } = await supabase
      .from("users")
      .select("id, line_user_id, display_name")
      .eq("id", teacher_id)
      .single();

    if (!invitee?.line_user_id) {
      return NextResponse.json({ error: "ไม่พบบัญชี LINE ของครูที่เชิญ" }, { status: 404 });
    }

    const inviteToken = randomUUID();
    const { error: insertErr } = await supabase.from("co_teacher_invites").insert({
      owner_id: owner.id,
      invitee_id: teacher_id,
      token: inviteToken,
    });

    if (insertErr) throw insertErr;

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
    const flexMsg = buildCoTeacherInviteFlex(
      liffUrl,
      inviteToken,
      owner.display_name || "ครู"
    );

    let lineSent = false;
    try {
      await getLineClient().pushMessage({
        to: invitee.line_user_id,
        messages: [flexMsg as messagingApi.FlexMessage],
      });
      lineSent = true;
    } catch (pushErr) {
      console.warn("Co-teacher invite push failed:", pushErr);
    }

    const inviteUrl = `${liffUrl}/settings/co-teachers/invite?token=${encodeURIComponent(inviteToken)}`;

    return NextResponse.json({
      success: true,
      token: inviteToken,
      line_sent: lineSent,
      invite_url: inviteUrl,
      invitee_name: invitee.display_name,
    });
  } catch (error: any) {
    console.error("Co-teacher invite POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
