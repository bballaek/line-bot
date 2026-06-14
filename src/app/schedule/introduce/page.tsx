"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IntroduceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/schedule/classrooms"); }, [router]);
  return null;
}
