import { NextRequest, NextResponse } from "next/server";
import { canManageClass, getSupabase, getUserByLineId } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get("group_id");
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");

    if (!groupId) {
      return NextResponse.json({ error: "group_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: group } = await supabase
      .from("groups")
      .select("line_group_id, group_name")
      .eq("line_group_id", groupId)
      .maybeSingle();

    if (!group) {
      return NextResponse.json({
        error: "ยังไม่พบกลุ่มนี้ — รอบอทเข้ากลุ่มสักครู่แล้วลองใหม่",
        found: false,
      }, { status: 404 });
    }

    let canRegister = false;
    if (lineUserId) {
      const actor = await getUserByLineId(supabase, lineUserId);
      if (actor) {
        canRegister = await canManageClass(supabase, actor);
      }
    }

    const { data: existing } = await supabase
      .from("classrooms")
      .select("id, name, owner_id, is_active")
      .eq("line_group_id", groupId)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      found: true,
      group_name: group.group_name,
      line_group_id: group.line_group_id,
      can_register: canRegister,
      already_registered: !!existing,
      classroom: existing ? { id: existing.id, name: existing.name } : null,
    });
  } catch (error: any) {
    console.error("Register GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
