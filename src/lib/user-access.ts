export type UserRole = "teacher" | "student";

export function getTeacherLineIds(): string[] {
  return (process.env.TEACHER_LINE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function resolveRole(lineUserId: string, currentRole?: string | null): UserRole {
  if (getTeacherLineIds().includes(lineUserId)) return "teacher";
  if (currentRole === "teacher") return "teacher";
  return "student";
}
