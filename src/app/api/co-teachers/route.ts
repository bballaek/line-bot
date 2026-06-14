import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveRole } from "@/lib/user-access";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key);
}

async function getOwnerUser(lineUserId: string) {
  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("line_user_id", lineUserId)
    .single();
  if (!user) return null;
  if (resolveRole(lineUserId, user.role) !== "teacher") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const owner = await getOwnerUser(lineUserId);
    if (!owner) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from("co_teachers")
      .select("id, teacher_id")
      .eq("owner_id", owner.id);

    if (error) throw error;

    const teacherIds = (rows || []).map((r) => r.teacher_id);
    let usersMap: Record<string, { display_name: string | null; picture_url: string | null }> = {};

    if (teacherIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, display_name, picture_url")
        .in("id", teacherIds);
      usersMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
    }

    const coTeachers = (rows || []).map((row) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      display_name: usersMap[row.teacher_id]?.display_name ?? null,
      picture_url: usersMap[row.teacher_id]?.picture_url ?? null,
    }));

    const { data: pendingRows } = await supabase
      .from("co_teacher_invites")
      .select("id, token, invitee_id, created_at")
      .eq("owner_id", owner.id)
      .eq("status", "pending");

    const pendingIds = (pendingRows || []).map((r) => r.invitee_id);
    let pendingUsersMap: Record<string, { display_name: string | null; picture_url: string | null }> = {};
    if (pendingIds.length > 0) {
      const { data: pendingUsers } = await supabase
        .from("users")
        .select("id, display_name, picture_url")
        .in("id", pendingIds);
      pendingUsersMap = Object.fromEntries((pendingUsers || []).map((u) => [u.id, u]));
    }

    const pendingInvites = (pendingRows || []).map((row) => ({
      id: row.id,
      token: row.token,
      invitee_id: row.invitee_id,
      display_name: pendingUsersMap[row.invitee_id]?.display_name ?? null,
      picture_url: pendingUsersMap[row.invitee_id]?.picture_url ?? null,
      created_at: row.created_at,
    }));

    return NextResponse.json({ coTeachers, pendingInvites });
  } catch (error: any) {
    console.error("Co-teachers GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_user_id, teacher_id } = body;
    if (!line_user_id || !teacher_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const owner = await getOwnerUser(line_user_id);
    if (!owner) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    if (owner.id === teacher_id) {
      return NextResponse.json({ error: "ไม่สามารถเพิ่มตัวเองได้" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("co_teachers")
      .insert({ owner_id: owner.id, teacher_id });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "ครูคนนี้อยู่ในรายการแล้ว" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Co-teachers POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    const id = req.nextUrl.searchParams.get("id");
    if (!lineUserId || !id) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const owner = await getOwnerUser(lineUserId);
    if (!owner) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("co_teachers")
      .delete()
      .eq("id", id)
      .eq("owner_id", owner.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Co-teachers DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
