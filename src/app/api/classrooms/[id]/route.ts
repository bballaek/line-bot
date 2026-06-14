import { NextRequest, NextResponse } from "next/server";
import { canManageClass, getSupabase, getUserByLineId } from "@/lib/api-auth";
import { getClassroomAccess, mapMember, syncClassroomMembers } from "@/lib/classroom-sync";

type Params = { params: Promise<{ id: string }> };

async function resolveAccess(supabase: ReturnType<typeof getSupabase>, classroomId: string, lineUserId: string) {
  const actor = await getUserByLineId(supabase, lineUserId);
  if (!actor) return null;
  const isManager = await canManageClass(supabase, actor);
  const access = await getClassroomAccess(supabase, classroomId, actor.id, lineUserId, isManager);

  let canManage = false;
  if (isManager && access.classroom) {
    if (access.classroom.owner_id === actor.id) {
      canManage = true;
    } else {
      const { count } = await supabase
        .from("co_teachers")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", access.classroom.owner_id)
        .eq("teacher_id", actor.id);
      canManage = (count ?? 0) > 0;
    }
  }

  return { actor, ...access, canManage };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const access = await resolveAccess(supabase, id, lineUserId);
    if (!access?.classroom) {
      return NextResponse.json({ error: "ไม่พบห้องเรียน" }, { status: 404 });
    }
    if (!access.canManage && !access.isMember) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from("classroom_members")
      .select("id, classroom_id, user_id, line_user_id, display_name, picture_url, student_number, full_name, nickname")
      .eq("classroom_id", id)
      .order("student_number", { ascending: true, nullsFirst: false });

    if (error) throw error;

    const rows = (members || [])
      .map(mapMember)
      .sort((a, b) => {
        if (a.student_number != null && b.student_number != null) return a.student_number - b.student_number;
        if (a.student_number != null) return -1;
        if (b.student_number != null) return 1;
        return (a.display_name || "").localeCompare(b.display_name || "", "th");
      });

    const { data: group } = await supabase
      .from("groups")
      .select("group_name")
      .eq("line_group_id", access.classroom.line_group_id)
      .maybeSingle();

    return NextResponse.json({
      classroom: { ...access.classroom, group_name: group?.group_name ?? null },
      members: rows,
      can_manage: access.canManage,
      my_member_id: access.memberId,
    });
  } catch (error: any) {
    console.error("Classroom GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const access = await resolveAccess(supabase, id, lineUserId);
    if (!access?.classroom || !access.canManage) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    await supabase.from("classrooms").update({ is_active: false }).eq("id", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Classroom DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const lineUserId = body.line_user_id || req.nextUrl.searchParams.get("line_user_id");
    const action = body.action;

    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const access = await resolveAccess(supabase, id, lineUserId);
    if (!access?.classroom) {
      return NextResponse.json({ error: "ไม่พบห้องเรียน" }, { status: 404 });
    }

    if (action === "sync") {
      if (!access.canManage) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
      }
      const syncResult = await syncClassroomMembers(
        supabase,
        id,
        access.classroom.line_group_id
      );
      return NextResponse.json({ sync: syncResult });
    }

    if (action === "reopen") {
      if (!access.canManage) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
      }
      await supabase.from("classrooms").update({ is_active: true }).eq("id", id);
      const syncResult = await syncClassroomMembers(
        supabase,
        id,
        access.classroom.line_group_id
      );
      return NextResponse.json({ sync: syncResult });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Classroom POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
