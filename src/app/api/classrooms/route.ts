import { NextRequest, NextResponse } from "next/server";
import { canManageClass, getSupabase, getUserByLineId } from "@/lib/api-auth";
import { syncClassroomMembers } from "@/lib/classroom-sync";

export async function GET(req: NextRequest) {
  try {
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, lineUserId);
    if (!actor) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

    const isManager = await canManageClass(supabase, actor);

    if (isManager) {
      const status = req.nextUrl.searchParams.get("status");

      const buildList = async (active: boolean) => {
        const { data: rows, error } = await supabase
          .from("classrooms")
          .select("id, name, line_group_id, is_active, created_at")
          .eq("owner_id", actor.id)
          .eq("is_active", active)
          .order("created_at", { ascending: false });
        if (error) throw error;

        return Promise.all(
          (rows || []).map(async (c) => {
            const { count } = await supabase
              .from("classroom_members")
              .select("*", { count: "exact", head: true })
              .eq("classroom_id", c.id);
            const { data: group } = await supabase
              .from("groups")
              .select("group_name")
              .eq("line_group_id", c.line_group_id)
              .maybeSingle();
            return { ...c, member_count: count ?? 0, group_name: group?.group_name ?? null };
          })
        );
      };

      if (status === "closed") {
        const closed = await buildList(false);
        return NextResponse.json({ classrooms: closed });
      }

      if (status === "active") {
        const active = await buildList(true);
        return NextResponse.json({ classrooms: active });
      }

      const [active, closed] = await Promise.all([buildList(true), buildList(false)]);

      const linkedIds = new Set([...active, ...closed].map((c) => c.line_group_id));
      const { data: allGroups } = await supabase
        .from("groups")
        .select("line_group_id, group_name")
        .order("group_name");

      const pending_groups = (allGroups || [])
        .filter((g) => !linkedIds.has(g.line_group_id))
        .map((g) => ({ line_group_id: g.line_group_id, group_name: g.group_name }));

      return NextResponse.json({ active, closed, pending_groups });
    }

    const { data: memberships, error: memErr } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("line_user_id", lineUserId);

    if (memErr) throw memErr;

    const ids = (memberships || []).map((m) => m.classroom_id);
    if (ids.length === 0) return NextResponse.json({ classrooms: [] });

    const { data: joined, error } = await supabase
      .from("classrooms")
      .select("id, name, line_group_id, is_active, created_at")
      .in("id", ids)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const classrooms = await Promise.all(
      (joined || []).map(async (c) => {
        const { count } = await supabase
          .from("classroom_members")
          .select("*", { count: "exact", head: true })
          .eq("classroom_id", c.id);
        const { data: group } = await supabase
          .from("groups")
          .select("group_name")
          .eq("line_group_id", c.line_group_id)
          .maybeSingle();
        return { ...c, member_count: count ?? 0, group_name: group?.group_name ?? null };
      })
    );

    return NextResponse.json({ classrooms });
  } catch (error: any) {
    console.error("Classrooms GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_user_id, name, line_group_id, sync_members } = body;

    if (!line_user_id || !line_group_id) {
      return NextResponse.json({ error: "กรุณาเลือกกลุ่ม LINE" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, line_user_id);
    if (!actor) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

    const isManager = await canManageClass(supabase, actor);
    if (!isManager) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });

    const { data: group } = await supabase
      .from("groups")
      .select("line_group_id, group_name")
      .eq("line_group_id", line_group_id)
      .maybeSingle();

    if (!group) {
      return NextResponse.json({
        error: "ยังไม่พบกลุ่มนี้ — เชิญบอท Song-Yang เข้ากลุ่ม LINE ก่อน แล้วลองใหม่",
      }, { status: 404 });
    }

    const classroomName = name?.trim() || group.group_name || "ห้องเรียน";

    const { data: classroom, error } = await supabase
      .from("classrooms")
      .insert({
        owner_id: actor.id,
        name: classroomName,
        line_group_id,
      })
      .select("id, name, line_group_id, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "เชื่อมกลุ่ม LINE นี้แล้ว" }, { status: 409 });
      }
      throw error;
    }

    let syncResult = { synced: 0, total: 0 };
    if (sync_members !== false) {
      syncResult = await syncClassroomMembers(supabase, classroom.id, line_group_id);
    }

    return NextResponse.json({
      classroom: { ...classroom, member_count: syncResult.synced, group_name: group.group_name },
      sync: syncResult,
    });
  } catch (error: any) {
    console.error("Classrooms POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
