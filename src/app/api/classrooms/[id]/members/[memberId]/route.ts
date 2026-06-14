import { NextRequest, NextResponse } from "next/server";
import { canManageClass, getSupabase, getUserByLineId } from "@/lib/api-auth";
import { getClassroomAccess, mapMember } from "@/lib/classroom-sync";

type Params = { params: Promise<{ id: string; memberId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id, memberId } = await params;
    const body = await req.json();
    const { line_user_id, student_number, full_name, nickname } = body;

    if (!line_user_id) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const num = student_number === "" || student_number == null ? null : Number(student_number);
    if (num != null && (!Number.isInteger(num) || num < 1 || num > 999)) {
      return NextResponse.json({ error: "เลขที่ไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, line_user_id);
    if (!actor) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

    const isManager = await canManageClass(supabase, actor);
    const access = await getClassroomAccess(supabase, id, actor.id, line_user_id, isManager);

    if (!access.classroom) {
      return NextResponse.json({ error: "ไม่พบห้องเรียน" }, { status: 404 });
    }

    const { data: member } = await supabase
      .from("classroom_members")
      .select("id, line_user_id, classroom_id")
      .eq("id", memberId)
      .eq("classroom_id", id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "ไม่พบนักเรียน" }, { status: 404 });
    }

    let canEdit = member.line_user_id === line_user_id;
    if (!canEdit && isManager) {
      if (access.classroom.owner_id === actor.id) canEdit = true;
      else {
        const { count } = await supabase
          .from("co_teachers")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", access.classroom.owner_id)
          .eq("teacher_id", actor.id);
        canEdit = (count ?? 0) > 0;
      }
    }

    if (!canEdit) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    if (num != null) {
      const { data: conflict } = await supabase
        .from("classroom_members")
        .select("id")
        .eq("classroom_id", id)
        .eq("student_number", num)
        .neq("id", memberId)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: `เลขที่ ${num} ถูกใช้แล้วในห้องนี้` }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from("classroom_members")
      .update({
        student_number: num,
        full_name: full_name?.trim() || null,
        nickname: nickname?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: actor.id,
      })
      .eq("id", memberId)
      .select("id, classroom_id, user_id, line_user_id, display_name, picture_url, student_number, full_name, nickname")
      .single();

    if (error) throw error;

    return NextResponse.json({ member: mapMember(data) });
  } catch (error: any) {
    console.error("Member PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, memberId } = await params;
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, lineUserId);
    if (!actor) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

    const isManager = await canManageClass(supabase, actor);
    const access = await getClassroomAccess(supabase, id, actor.id, lineUserId, isManager);

    if (!access.classroom || access.classroom.owner_id !== actor.id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    await supabase
      .from("classroom_members")
      .delete()
      .eq("id", memberId)
      .eq("classroom_id", id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Member DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
