"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/lib/liff-provider";
import { supabase } from "@/lib/supabase";

export type AppUser = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  role: "teacher" | "student";
  isCoTeacher: boolean;
};

export function useAppUser() {
  const { isReady, userId, profile } = useLiff();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isReady || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/sync?line_user_id=${encodeURIComponent(userId)}`);
        let dbUser = res.ok ? (await res.json()).user : null;

        if (!dbUser) {
          const profileRes = await fetch("/api/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              line_user_id: userId,
              display_name: profile?.displayName,
              picture_url: profile?.pictureUrl,
            }),
          });
          if (profileRes.ok) dbUser = (await profileRes.json()).user;
        }

        if (!dbUser || cancelled) return;

        const { count, error: coErr } = await supabase
          .from("co_teachers")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", dbUser.id);

        if (coErr) console.warn("co_teachers query:", coErr.message);

        if (!cancelled) {
          setUser({
            ...dbUser,
            role: dbUser.role === "teacher" ? "teacher" : "student",
            isCoTeacher: (count ?? 0) > 0,
          });
        }
      } catch (e) {
        console.error("useAppUser error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isReady, userId, reloadKey, profile?.displayName, profile?.pictureUrl]);

  const canManageClass = user?.role === "teacher" || user?.isCoTeacher;
  const canManageIntegrations = user?.role === "teacher";
  const refresh = () => setReloadKey((k) => k + 1);

  return { user, loading, canManageClass, canManageIntegrations, refresh };
}
