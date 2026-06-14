import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllGroupMemberIds, fetchGroupMemberProfile } from "@/lib/line-client";
import { resolveRole } from "@/lib/user-access";

export type MemberRow = {
  id: string;
  classroom_id: string;
  user_id: string | null;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  student_number: number | null;
  full_name: string | null;
  nickname: string | null;
  profile_complete: boolean;
};

export function mapMember(row: {
  id: string;
  classroom_id: string;
  user_id: string | null;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  student_number: number | null;
  full_name: string | null;
  nickname: string | null;
}): MemberRow {
  return {
    ...row,
    profile_complete: !!(row.student_number && row.full_name?.trim() && row.nickname?.trim()),
  };
}

export async function syncClassroomMembers(
  supabase: SupabaseClient,
  classroomId: string,
  lineGroupId: string
) {
  const memberIds = await fetchAllGroupMemberIds(lineGroupId);
  let synced = 0;

  for (const lineUserId of memberIds) {
    const profile = await fetchGroupMemberProfile(lineGroupId, lineUserId);
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    let userId = existingUser?.id ?? null;

    if (!userId) {
      const role = resolveRole(lineUserId, null);
      const { data: created } = await supabase
        .from("users")
        .upsert(
          { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl, role },
          { onConflict: "line_user_id" }
        )
        .select("id")
        .single();
      userId = created?.id ?? null;
    } else {
      await supabase
        .from("users")
        .update({ display_name: displayName, picture_url: pictureUrl })
        .eq("id", userId);
    }

    const { data: existingMember } = await supabase
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (existingMember) {
      await supabase
        .from("classroom_members")
        .update({ user_id: userId, display_name: displayName, picture_url: pictureUrl, updated_at: new Date().toISOString() })
        .eq("id", existingMember.id);
    } else {
      await supabase.from("classroom_members").insert({
        classroom_id: classroomId,
        user_id: userId,
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
      });
    }
    synced++;
  }

  return { synced, total: memberIds.length };
}

export async function getClassroomAccess(
  supabase: SupabaseClient,
  classroomId: string,
  actorId: string,
  actorLineId: string,
  isManager: boolean
) {
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, owner_id, name, line_group_id, is_active, created_at")
    .eq("id", classroomId)
    .maybeSingle();

  if (!classroom) return { classroom: null, canManage: false, isMember: false };

  const { data: membership } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("line_user_id", actorLineId)
    .maybeSingle();

  const canManage = isManager && classroom.owner_id === actorId;
  const isMember = !!membership;

  return { classroom, canManage, isMember, memberId: membership?.id ?? null };
}
