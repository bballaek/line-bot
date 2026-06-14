import { NextRequest, NextResponse } from "next/server";
import { canManageClass, getSupabase, getUserByLineId } from "@/lib/api-auth";

export type StudentRow = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  student_number: number | null;
  full_name: string | null;
  nickname: string | null;
  profile_complete: boolean;
};

function mapStudent(
  user: {
    id: string;
    line_user_id: string;
    display_name: string | null;
    picture_url: string | null;
  },
  profile?: {
    student_number: number | null;
    full_name: string | null;
    nickname: string | null;
  } | null
): StudentRow {
  const fullName = profile?.full_name ?? null;
  const nickname = profile?.nickname ?? null;
  const studentNumber = profile?.student_number ?? null;
  return {
    id: user.id,
    line_user_id: user.line_user_id,
    display_name: user.display_name,
    picture_url: user.picture_url,
    student_number: studentNumber,
    full_name: fullName,
    nickname,
    profile_complete: !!(studentNumber && fullName?.trim() && nickname?.trim()),
  };
}

export async function GET(req: NextRequest) {
  try {
    const lineUserId = req.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, lineUserId);
    if (!actor) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const isManager = await canManageClass(supabase, actor);

    if (isManager) {
      const { data: students, error } = await supabase
        .from("users")
        .select("id, line_user_id, display_name, picture_url")
        .eq("role", "student")
        .order("display_name");

      if (error) throw error;

      const ids = (students || []).map((s) => s.id);
      let profileMap: Record<string, { student_number: number | null; full_name: string | null; nickname: string | null }> = {};

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("student_profiles")
          .select("user_id, student_number, full_name, nickname")
          .in("user_id", ids);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      }

      const rows = (students || [])
        .map((s) => mapStudent(s, profileMap[s.id]))
        .sort((a, b) => {
          if (a.student_number != null && b.student_number != null) {
            return a.student_number - b.student_number;
          }
          if (a.student_number != null) return -1;
          if (b.student_number != null) return 1;
          return (a.display_name || "").localeCompare(b.display_name || "", "th");
        });

      const complete = rows.filter((r) => r.profile_complete).length;
      return NextResponse.json({ students: rows, stats: { total: rows.length, complete } });
    }

    const { data: profile } = await supabase
      .from("student_profiles")
      .select("student_number, full_name, nickname")
      .eq("user_id", actor.id)
      .maybeSingle();

    return NextResponse.json({
      student: mapStudent(actor, profile),
    });
  } catch (error: any) {
    console.error("Students GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      line_user_id,
      target_user_id,
      student_number,
      full_name,
      nickname,
    } = body;

    if (!line_user_id) {
      return NextResponse.json({ error: "line_user_id required" }, { status: 400 });
    }

    const num = student_number === "" || student_number == null ? null : Number(student_number);
    if (num != null && (!Number.isInteger(num) || num < 1 || num > 999)) {
      return NextResponse.json({ error: "เลขที่ไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = getSupabase();
    const actor = await getUserByLineId(supabase, line_user_id);
    if (!actor) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const isManager = await canManageClass(supabase, actor);
    const targetId = isManager && target_user_id ? target_user_id : actor.id;

    if (!isManager && targetId !== actor.id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    if (isManager && target_user_id) {
      const { data: target } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", targetId)
        .maybeSingle();
      if (!target || target.role !== "student") {
        return NextResponse.json({ error: "ไม่พบนักเรียน" }, { status: 404 });
      }
    }

    if (num != null) {
      const { data: conflict } = await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("student_number", num)
        .neq("user_id", targetId)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: `เลขที่ ${num} ถูกใช้แล้ว` }, { status: 409 });
      }
    }

    const payload = {
      user_id: targetId,
      student_number: num,
      full_name: full_name?.trim() || null,
      nickname: nickname?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: actor.id,
    };

    const { data, error } = await supabase
      .from("student_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, student_number, full_name, nickname")
      .single();

    if (error) throw error;

    const { data: targetUser } = await supabase
      .from("users")
      .select("id, line_user_id, display_name, picture_url")
      .eq("id", targetId)
      .single();

    return NextResponse.json({
      student: mapStudent(targetUser!, data),
    });
  } catch (error: any) {
    console.error("Students PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
