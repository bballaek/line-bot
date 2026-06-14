"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/schedule/classrooms"); }, [router]);
  return null;
}
